import "server-only";

import { db } from "@/shared/lib/db";
import { TDailyCount } from "@/shared/types/admin";

// plain server module (not a server action file), so these helpers are not callable from the browser

export const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

/** Visits per UTC day for the last `days` days, including days without visits. */
export const getDailyVisits = async (days: number): Promise<TDailyCount[]> => {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "time") AS day, COUNT(*) AS count
    FROM "PageVisit"
    WHERE "time" >= ${since}
    GROUP BY 1
  `;
  const counts = new Map(rows.map((row) => [toDateKey(row.day), Number(row.count)]));

  return Array.from({ length: days }, (_, index) => {
    const date = toDateKey(new Date(since.getTime() + index * DAY_MS));
    return { date, count: counts.get(date) ?? 0 };
  });
};

/** Revenue in cents per UTC day (by payment date) for the last `days` days, refunds excluded. */
export const getDailyRevenue = async (days: number): Promise<TDailyCount[]> => {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db.$queryRaw<{ day: Date; total: bigint }[]>`
    SELECT date_trunc('day', "paidAt") AS day, SUM("totalCents") AS total
    FROM "Order"
    WHERE "paidAt" >= ${since} AND "status" IN ('PAID', 'SHIPPED', 'DELIVERED')
    GROUP BY 1
  `;
  const totals = new Map(rows.map((row) => [toDateKey(row.day), Number(row.total)]));

  return Array.from({ length: days }, (_, index) => {
    const date = toDateKey(new Date(since.getTime() + index * DAY_MS));
    return { date, count: totals.get(date) ?? 0 };
  });
};
