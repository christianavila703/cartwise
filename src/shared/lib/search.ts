import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/shared/lib/db";
import { TSearchCategory, TSearchProduct, TSearchSort } from "@/shared/types/search";

export const MAX_QUERY_LENGTH = 80;
const MAX_TERMS = 6;
const FUZZY_THRESHOLD = 0.35;

/** Trims, collapses whitespace and caps the length of a search query. */
export const normalizeQuery = (query: unknown) =>
  typeof query === "string" ? query.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH) : "";

const toTerms = (query: string) => query.toLowerCase().split(" ").filter(Boolean).slice(0, MAX_TERMS);

// every word has to appear somewhere: in the name, brand, category or description
const whereForTerms = (terms: string[]): Prisma.ProductWhereInput => ({
  AND: terms.map((term) => ({
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { brand: { name: { contains: term, mode: "insensitive" } } },
      { category: { name: { contains: term, mode: "insensitive" } } },
      { desc: { contains: term, mode: "insensitive" } },
    ],
  })),
});

const productSelect = {
  id: true,
  name: true,
  images: true,
  price: true,
  salePrice: true,
  isAvailable: true,
  specialFeatures: true,
  createdAt: true,
  brand: { select: { name: true } },
  category: { select: { name: true } },
} satisfies Prisma.ProductSelect;

type TProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

/** Higher is more relevant: name matches beat brand and category matches, which beat description matches. */
const scoreProduct = (product: TProductRow, query: string, terms: string[]) => {
  const name = product.name.toLowerCase();
  const phrase = query.toLowerCase();
  let score = 0;
  if (name === phrase) score += 100;
  if (name.startsWith(phrase)) score += 40;
  if (name.includes(phrase)) score += 25;
  terms.forEach((term) => {
    if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) score += 12;
    else if (name.includes(term)) score += 8;
    if (product.brand.name.toLowerCase().includes(term)) score += 5;
    if (product.category.name.toLowerCase().includes(term)) score += 4;
  });
  if (product.isAvailable) score += 3;
  return score;
};

const toSearchProduct = (product: TProductRow): TSearchProduct => ({
  id: product.id,
  name: product.name,
  images: product.images,
  price: product.price,
  salePrice: product.salePrice,
  isAvailable: product.isAvailable,
  specialFeatures: product.specialFeatures,
  brand: product.brand.name,
  category: product.category.name,
});

const sorters: Record<Exclude<TSearchSort, "relevance">, (a: TProductRow, b: TProductRow) => number> = {
  priceAsc: (a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price),
  priceDesc: (a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price),
  newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
};

type TSearchOptions = { sort?: TSearchSort; inStockOnly?: boolean; limit?: number };

export const searchProducts = async (rawQuery: string, { sort = "relevance", inStockOnly = false, limit }: TSearchOptions = {}) => {
  const query = normalizeQuery(rawQuery);
  const terms = toTerms(query);
  if (!terms.length) return { query, total: 0, products: [] as TSearchProduct[] };

  const rows = await db.product.findMany({
    where: { ...whereForTerms(terms), ...(inStockOnly ? { isAvailable: true } : {}) },
    select: productSelect,
    take: 200,
  });

  const ranked =
    sort === "relevance"
      ? rows
          .map((product) => ({ product, score: scoreProduct(product, query, terms) }))
          .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
          .map(({ product }) => product)
      : [...rows].sort(sorters[sort]);

  return {
    query,
    total: rows.length,
    products: (limit ? ranked.slice(0, limit) : ranked).map(toSearchProduct),
  };
};

/** Closest product name for a query with typos, e.g. "iphnoe" -> "Apple iPhone 15 Pro Max". */
export const getSpellingSuggestion = async (rawQuery: string) => {
  const query = normalizeQuery(rawQuery);
  if (query.length < 3) return null;

  const rows = await db.$queryRaw<{ name: string; score: number }[]>`
    SELECT name, word_similarity(${query}, name) AS score
    FROM "Product"
    WHERE word_similarity(${query}, name) >= ${FUZZY_THRESHOLD}
    ORDER BY score DESC
    LIMIT 1
  `;
  return rows[0]?.name ?? null;
};

/** Categories whose name matches, with the full store URL of each. */
export const searchCategories = async (rawQuery: string, limit = 4): Promise<TSearchCategory[]> => {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return [];

  const categories = await db.category.findMany({ select: { id: true, name: true, url: true, parentID: true } });
  const byID = new Map(categories.map((category) => [category.id, category]));
  const pathOf = (id: string) => {
    const urls: string[] = [];
    const names: string[] = [];
    let current = byID.get(id);
    while (current && urls.length < 5) {
      urls.unshift(current.url);
      names.unshift(current.name);
      current = current.parentID ? byID.get(current.parentID) : undefined;
    }
    return { href: "/list/" + urls.join("/"), names };
  };

  const phrase = query.toLowerCase();
  return categories
    .filter((category) => category.name.toLowerCase().includes(phrase))
    .map((category) => {
      const { href, names } = pathOf(category.id);
      return { id: category.id, name: category.name, href, parentNames: names.slice(0, -1) };
    })
    .sort((a, b) => a.parentNames.length - b.parentNames.length || a.name.localeCompare(b.name))
    .slice(0, limit);
};
