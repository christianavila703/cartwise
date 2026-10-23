import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "./db";
import { verifyPassword } from "./password";

const ROLE_REFRESH_MS = 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email.trim().toLowerCase(),
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const valid = await verifyPassword(credentials.password, user.hashedPassword);
        if (!valid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // user is only set on sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roleCheckedAt = Date.now();
        return token;
      }

      // refresh the role periodically so role changes reach the session without signing in again.
      // this only drives the UI (e.g. the admin link); admin pages and actions always check the database.
      // tokens issued before roles existed only carry the user id in `sub`
      token.id ??= token.sub ?? "";
      const isStale = !token.role || Date.now() - (token.roleCheckedAt ?? 0) > ROLE_REFRESH_MS;
      if (!token.id || !isStale) return token;
      try {
        const dbUser = await db.user.findUnique({ where: { id: token.id }, select: { role: true } });
        token.role = dbUser?.role ?? "USER";
        token.roleCheckedAt = Date.now();
      } catch {
        // keep the previous role if the database is unreachable
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id ?? "";
      session.user.role = token.role ?? "USER";
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
