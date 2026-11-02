import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getAllCategoriesJSON } from "@/actions/category/category";
import { getOneProduct } from "@/actions/product/product";
import { CATEGORIES_TAG } from "@/shared/constants/cacheTags";

/**
 * The category tree for the store menus. It changes rarely and is shown on every page,
 * so it's cached across requests and refreshed by the admin (or after 10 minutes).
 */
export const getStoreCategories = unstable_cache(
  async () => {
    const result = await getAllCategoriesJSON();
    // throwing keeps a failed read out of the cache
    if (!result.res) throw new Error(result.error ?? "Can't load categories");
    return result.res;
  },
  ["store-categories"],
  { tags: [CATEGORIES_TAG], revalidate: 600 }
);

/** Same as getStoreCategories, but an empty menu instead of an error page when the database is unreachable. */
export const getStoreCategoriesSafe = async () => {
  try {
    return await getStoreCategories();
  } catch {
    return [];
  }
};

/** One product page, loaded once per request even though metadata and the page both need it. */
export const getProductPage = cache(async (productID: string) => {
  const response = await getOneProduct(productID);
  return response.res ?? null;
});
