export type TSearchSort = "relevance" | "priceAsc" | "priceDesc" | "newest";

export type TSearchProduct = {
  id: string;
  name: string;
  images: string[];
  price: number;
  salePrice: number | null;
  isAvailable: boolean;
  specialFeatures: string[];
  brand: string;
  category: string;
};

export type TSearchCategory = {
  id: string;
  name: string;
  href: string;
  /** names of the parent categories, e.g. ["Computers & Laptops", "Laptops"] */
  parentNames: string[];
};

export type TSearchSuggestions = {
  query: string;
  products: TSearchProduct[];
  categories: TSearchCategory[];
  total: number;
  /** a corrected product name when nothing matched */
  didYouMean: string | null;
};
