"use server";

import { getSpellingSuggestion, normalizeQuery, searchCategories, searchProducts } from "@/shared/lib/search";
import { TSearchSuggestions } from "@/shared/types/search";

const SUGGESTED_PRODUCTS = 6;

/** Suggestions for the search box while typing. Public, like the store itself. */
export const getSearchSuggestions = async (rawQuery: string) => {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return { error: "Query too short" };

  try {
    const [products, categories] = await Promise.all([
      searchProducts(query, { limit: SUGGESTED_PRODUCTS }),
      searchCategories(query),
    ]);
    const didYouMean = products.total === 0 && categories.length === 0 ? await getSpellingSuggestion(query) : null;

    const result: TSearchSuggestions = {
      query,
      products: products.products,
      categories,
      total: products.total,
      didYouMean,
    };
    return { res: result };
  } catch {
    return { error: "Search is unavailable right now" };
  }
};
