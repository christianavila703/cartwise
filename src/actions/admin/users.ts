"use server";

import { Role } from "@prisma/client";

import { getAdminId, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TAdminUser } from "@/shared/types/admin";

export const getUsers = async () => {
  const adminID = await getAdminId();
  if (!adminID) return UNAUTHORIZED;

  try {
    const result: TAdminUser[] = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { res: { users: result, currentUserID: adminID } };
  } catch {
    return { error: "Can't load users" };
  }
};

export const setUserRole = async (userID: string, role: Role) => {
  const adminID = await getAdminId();
  if (!adminID) return UNAUTHORIZED;
  if (!userID || !(role in Role)) return { error: "Invalid Data!" };
  // keeps at least one admin and stops admins from locking themselves out
  if (userID === adminID) return { error: "You can't change your own role" };

  try {
    const result = await db.user.update({
      where: { id: userID },
      data: { role },
      select: { id: true, role: true },
    });
    return { res: result };
  } catch {
    return { error: "Can't update the user" };
  }
};

export const deleteUser = async (userID: string) => {
  const adminID = await getAdminId();
  if (!adminID) return UNAUTHORIZED;
  if (!userID) return { error: "Invalid Data!" };
  if (userID === adminID) return { error: "You can't delete your own account" };

  try {
    // orders are financial records, so customers who ordered are kept
    const orderCount = await db.order.count({ where: { userId: userID } });
    if (orderCount > 0) {
      return { error: `This customer has ${orderCount} order${orderCount > 1 ? "s" : ""} and can't be deleted` };
    }
    const result = await db.user.delete({ where: { id: userID }, select: { id: true } });
    return { res: result };
  } catch {
    return { error: "Can't delete the user" };
  }
};
