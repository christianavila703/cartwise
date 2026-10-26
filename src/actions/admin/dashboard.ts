"use server";

import { REVENUE_STATUSES } from "@/shared/constants/orders";
import { DAY_MS, getDailyRevenue, getDailyVisits } from "@/shared/lib/analytics";
import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { TDashboardData } from "@/shared/types/admin";


export const getDashboardData = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;

  try {
    const now = Date.now();
    const last30 = new Date(now - 30 * DAY_MS);
    const last60 = new Date(now - 60 * DAY_MS);

    const [
      products,
      inStock,
      onSale,
      categories,
      brands,
      users,
      admins,
      newUsers,
      visitsLast30,
      visitsPrevious30,
      byPageType,
      topVisited,
      catalogImages,
      missingDescription,
      daily,
      revenueLast30,
      revenuePrevious30,
      ordersLast30,
      ordersPrevious30,
      awaitingShipment,
      dailyRevenue,
      recentOrders,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { isAvailable: true } }),
      db.product.count({ where: { salePrice: { not: null } } }),
      db.category.count(),
      db.brand.count(),
      db.user.count(),
      db.user.count({ where: { role: "ADMIN" } }),
      db.user.count({ where: { createdAt: { gte: last30 } } }),
      db.pageVisit.count({ where: { time: { gte: last30 } } }),
      db.pageVisit.count({ where: { time: { gte: last60, lt: last30 } } }),
      db.pageVisit.groupBy({ by: ["pageType"], where: { time: { gte: last30 } }, _count: { _all: true } }),
      db.pageVisit.groupBy({
        by: ["productID"],
        where: { productID: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { productID: "desc" } },
        take: 5,
      }),
      db.product.findMany({ select: { images: true } }),
      db.product.count({ where: { OR: [{ desc: null }, { desc: "" }] } }),
      getDailyVisits(30),
      db.order.aggregate({
        where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: last30 } },
        _sum: { totalCents: true },
      }),
      db.order.aggregate({
        where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: last60, lt: last30 } },
        _sum: { totalCents: true },
      }),
      db.order.count({ where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: last30 } } }),
      db.order.count({ where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: last60, lt: last30 } } }),
      db.order.count({ where: { status: "PAID" } }),
      getDailyRevenue(30),
      db.order.findMany({
        where: { status: { not: "PENDING" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, status: true, shippingName: true, totalCents: true, createdAt: true },
      }),
    ]);

    const topIDs = topVisited.map((row) => row.productID).filter((id): id is string => !!id);
    const topProductsData = await db.product.findMany({
      where: { id: { in: topIDs } },
      select: { id: true, name: true, images: true, price: true, salePrice: true },
    });

    const result: TDashboardData = {
      sales: {
        revenueLast30Days: revenueLast30._sum.totalCents ?? 0,
        revenuePrevious30Days: revenuePrevious30._sum.totalCents ?? 0,
        ordersLast30Days: ordersLast30,
        ordersPrevious30Days: ordersPrevious30,
        awaitingShipment,
        dailyRevenue,
      },
      recentOrders,
      catalog: {
        products,
        inStock,
        outOfStock: products - inStock,
        onSale,
        categories,
        brands,
      },
      users: { total: users, admins, newLast30Days: newUsers },
      visits: {
        last30Days: visitsLast30,
        previous30Days: visitsPrevious30,
        daily,
        byPageType: byPageType.map((row) => ({ pageType: row.pageType, count: row._count._all })),
      },
      topProducts: topVisited
        .map((row) => {
          const product = topProductsData.find((item) => item.id === row.productID);
          if (!product) return null;
          return {
            id: product.id,
            name: product.name,
            image: product.images[0] ?? null,
            price: product.price,
            salePrice: product.salePrice,
            visits: row._count._all,
          };
        })
        .filter((item) => item !== null),
      health: {
        missingImages: catalogImages.filter((product) => product.images.length === 0).length,
        singleImage: catalogImages.filter((product) => product.images.length === 1).length,
        missingDescription,
      },
    };

    return { res: result };
  } catch {
    return { error: "Can't load dashboard data" };
  }
};
