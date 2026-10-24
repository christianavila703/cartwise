import { getServerSession } from "next-auth";

import { authOptions } from "./authOptions";
import { db } from "./db";

export const getSession = () => getServerSession(authOptions);

/**
 * Returns the signed-in user's id when they are an admin, otherwise null.
 * The role is read from the database, not the session token, so a demoted admin loses access immediately.
 */
export const getAdminId = async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });
    return user?.role === "ADMIN" ? user.id : null;
  } catch {
    // fail closed: if the role can't be verified, treat the user as not an admin
    return null;
  }
};

export const isAdmin = async () => (await getAdminId()) !== null;

export const UNAUTHORIZED = { error: "Unauthorized", res: undefined };
