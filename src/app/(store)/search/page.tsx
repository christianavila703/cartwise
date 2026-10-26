import { FolderTree, SearchX } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import ProductCard from "@/domains/product/components/productCard";
import { SearchBox } from "@/domains/store/search/components/searchBox";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getSpellingSuggestion, normalizeQuery, searchCategories, searchProducts } from "@/shared/lib/search";
import { TSearchSort } from "@/shared/types/search";
import { cn } from "@/shared/utils/styling";

type TSearchParams = { q?: string; sort?: string; stock?: string };
type TProps = { searchParams: Promise<TSearchParams> };

const SORTS: { value: TSearchSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

const POPULAR_CATEGORIES = [
  { name: "Smartphones", href: "/list/smartphones" },
  { name: "Laptops", href: "/list/pc-laptops/laptops" },
  { name: "Headphones", href: "/list/audio/headphones" },
  { name: "Tablets", href: "/list/tablets" },
  { name: "Watches", href: "/list/watches" },
  { name: "Cameras", href: "/list/photography/cameras" },
];

export const generateMetadata = async ({ searchParams }: TProps): Promise<Metadata> => {
  const query = normalizeQuery((await searchParams).q);
  return {
    title: query ? `“${query}” — Search — Cartwise` : "Search — Cartwise",
    // search result pages shouldn't compete with product and category pages in search engines
    robots: { index: false, follow: true },
  };
};

const SearchPage = async ({ searchParams }: TProps) => {
  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const sort: TSearchSort = SORTS.some((item) => item.value === params.sort) ? (params.sort as TSearchSort) : "relevance";
  const inStockOnly = params.stock === "1";

  const hrefWith = (changes: Partial<TSearchParams>) => {
    const next = new URLSearchParams();
    const merged = { q: query, sort, stock: inStockOnly ? "1" : undefined, ...changes };
    if (merged.q) next.set("q", merged.q);
    if (merged.sort && merged.sort !== "relevance") next.set("sort", merged.sort);
    if (merged.stock === "1") next.set("stock", "1");
    return `/search?${next.toString()}`;
  };

  const [results, categories] = query
    ? await Promise.all([searchProducts(query, { sort, inStockOnly }), searchCategories(query, 6)])
    : [null, []];
  const didYouMean = results && results.total === 0 && !inStockOnly ? await getSpellingSuggestion(query) : null;

  return (
    <div className="storeContainer">
      <div className="mt-[160px] mb-24 w-full">
        {/* the navbar search bar is hidden on phones, so the page brings its own there */}
        <div className="mx-auto max-w-2xl sm:hidden">
          <SearchBox key={query} defaultValue={query} autoFocus={!query} className="h-12" />
        </div>

        {!query ? (
          <div className="mt-12 text-center sm:mt-4">
            <h1 className="text-2xl font-light text-gray-900">What are you looking for?</h1>
            <p className="mt-2 text-sm text-gray-500">Search by product name, brand or category, or start with one of these:</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {POPULAR_CATEGORIES.map((category) => (
                <Link
                  key={category.href}
                  href={category.href}
                  className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-500"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-10 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:mt-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-light text-gray-900">
                  Results for <span className="font-normal">“{query}”</span>
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {results!.total} product{results!.total === 1 ? "" : "s"}
                  {inStockOnly && " in stock"}
                </p>
              </div>
              {results!.total > 0 || inStockOnly ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {SORTS.map((item) => (
                    <Link
                      key={item.value}
                      href={hrefWith({ sort: item.value })}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 transition-colors",
                        sort === item.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-200/70"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href={hrefWith({ stock: inStockOnly ? undefined : "1" })}
                    className={cn(
                      "ml-1 flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors",
                      inStockOnly
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-500"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-sm border",
                        inStockOnly ? "border-brand-600 bg-brand-600" : "border-gray-400"
                      )}
                    >
                      {inStockOnly && <span className="size-1.5 rounded-[1px] bg-white" />}
                    </span>
                    In stock only
                  </Link>
                </div>
              ) : null}
            </div>

            {categories.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Categories:</span>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={category.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:border-gray-500"
                  >
                    <FolderTree className="size-3.5 text-gray-400" />
                    {category.parentNames.length ? `${category.parentNames.at(-1)} › ` : ""}
                    {category.name}
                  </Link>
                ))}
              </div>
            )}

            {results!.products.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {results!.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    productId={product.id}
                    imgUrl={[
                      IMAGE_BASE_URL + product.images[0],
                      IMAGE_BASE_URL + (product.images[1] ?? product.images[0]),
                    ]}
                    name={product.name}
                    price={product.price}
                    isAvailable={product.isAvailable}
                    dealPrice={product.salePrice ?? undefined}
                    specs={product.specialFeatures}
                    url={`/product/${product.id}`}
                  />
                ))}
              </div>
            ) : (
              <div className="mx-auto mt-14 flex max-w-md flex-col items-center text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                  <SearchX className="size-7 text-gray-400" />
                </span>
                <h2 className="mt-5 text-lg font-medium text-gray-900">
                  {inStockOnly ? "Nothing in stock matches your search" : "No products found"}
                </h2>
                {didYouMean ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Did you mean{" "}
                    <Link href={hrefWith({ q: didYouMean })} className="font-medium text-brand-600 hover:underline">
                      {didYouMean}
                    </Link>
                    ?
                  </p>
                ) : inStockOnly ? (
                  <Link href={hrefWith({ stock: undefined })} className="mt-2 text-sm text-brand-600 hover:underline">
                    Include out-of-stock products
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Check the spelling or try a more general word.</p>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {POPULAR_CATEGORIES.map((category) => (
                    <Link
                      key={category.href}
                      href={category.href}
                      className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-500"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
