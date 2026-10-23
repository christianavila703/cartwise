import { getServerSession } from "next-auth";

import { authOptions } from "./authOptions";
import { db } from "./db";

export const getSession = () => getServerSession(authOptions);

/**
 * Checks the signed-in user is an admin.
 * The role is read from the database, not the session token, so a demoted admin loses access immediately.
 */
export const isAdmin = async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    return user?.role === "ADMIN";
  } catch {
    // fail closed: if the role can't be verified, treat the user as not an admin
    return false;
  }
};

export const UNAUTHORIZED = { error: "Unauthorized", res: undefined };
