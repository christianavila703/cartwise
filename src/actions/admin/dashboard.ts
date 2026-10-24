"use server";

import { DAY_MS, getDailyVisits } from "@/shared/lib/analytics";
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
      recentProducts,
      catalogImages,
      missingDescription,
      daily,
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
      db.product.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, images: true, price: true, isAvailable: true, createdAt: true },
      }),
      db.product.findMany({ select: { images: true } }),
      db.product.count({ where: { OR: [{ desc: null }, { desc: "" }] } }),
      getDailyVisits(30),
    ]);

    const topIDs = topVisited.map((row) => row.productID).filter((id): id is string => !!id);
    const topProductsData = await db.product.findMany({
      where: { id: { in: topIDs } },
      select: { id: true, name: true, images: true, price: true, salePrice: true },
    });

    const result: TDashboardData = {
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
      recentProducts: recentProducts.map((product) => ({
        id: product.id,
        name: product.name,
        image: product.images[0] ?? null,
        price: product.price,
        isAvailable: product.isAvailable,
        createdAt: product.createdAt,
      })),
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
