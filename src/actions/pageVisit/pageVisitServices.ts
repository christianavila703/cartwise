"use server";
import { PageType } from "@prisma/client";
import { z } from "zod";

import { TRAFFIC_LIST_PAGE_SIZE } from "@/shared/constants/admin/trafficView";
import { DAY_MS, getDailyVisits } from "@/shared/lib/analytics";
import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TTrafficStats } from "@/shared/types/admin";
import { TAddPageVisit } from "@/shared/types/common";

const ValidatePageVisit = z.object({
  pageType: z.enum(["MAIN", "LIST", "PRODUCT"]),
});

export type TTrafficListItem = {
  id: string;
  time: Date | null;
  pageType: PageType;
  pagePath: string | null;
  productID: string | null;
  deviceResolution: string | null;
  product: {
    name: string;
    category: {
      name: string;
    };
  } | null;
};

export const addVisit = async (data: TAddPageVisit) => {
  if (process.env.NODE_ENV !== "production") return { error: "Invalid ENV!" };

  if (!ValidatePageVisit.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    const result = await db.pageVisit.create({
      data: {
        pageType: data.pageType,
        pagePath: data.pagePath,
        productID: data.productID,
        deviceResolution: data.deviceResolution,
      },
    });

    if (!result) return { error: "Invalid Data!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getTrafficReport = async (skip: number = 0, pageType?: PageType) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (pageType && !(pageType in PageType)) return { error: "Invalid Data!" };

  try {
    const where = pageType ? { pageType } : {};
    const [list, totalCount] = await Promise.all([
      db.pageVisit.findMany({
        where,
        skip: Math.max(0, skip),
        take: TRAFFIC_LIST_PAGE_SIZE,
        include: {
          product: {
            select: {
              name: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          time: "desc",
        },
      }),
      db.pageVisit.count({ where }),
    ]);
    return { res: { list, totalCount } };
  } catch {
    return { error: "Can't load traffic" };
  }
};

export const getTrafficStats = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;

  try {
    const last30 = new Date(Date.now() - 30 * DAY_MS);
    const [total, last30Days, byPageType, topPaths, daily] = await Promise.all([
      db.pageVisit.count(),
      db.pageVisit.count({ where: { time: { gte: last30 } } }),
      db.pageVisit.groupBy({ by: ["pageType"], where: { time: { gte: last30 } }, _count: { _all: true } }),
      db.pageVisit.groupBy({
        by: ["pagePath"],
        where: { time: { gte: last30 }, pagePath: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { pagePath: "desc" } },
        take: 6,
      }),
      getDailyVisits(30),
    ]);

    const result: TTrafficStats = {
      total,
      last30Days,
      daily,
      byPageType: byPageType.map((row) => ({ pageType: row.pageType, count: row._count._all })),
      topPaths: topPaths.map((row) => ({ path: row.pagePath ?? "", count: row._count._all })),
    };
    return { res: result };
  } catch {
    return { error: "Can't load traffic stats" };
  }
};

export const deleteTraffic = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id || id === "") return { error: "Invalid Data!" };

  try {
    const result = await db.pageVisit.delete({
      where: {
        id,
      },
    });
    return { res: result };
  } catch {
    return { error: "Can't delete the visit" };
  }
};

export const clearTraffic = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;

  try {
    const result = await db.pageVisit.deleteMany();
    return { res: result.count };
  } catch {
    return { error: "Can't clear traffic" };
  }
};
