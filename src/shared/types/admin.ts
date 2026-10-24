import { PageType, Role } from "@prisma/client";

export type TDailyCount = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type TDashboardData = {
  catalog: {
    products: number;
    inStock: number;
    outOfStock: number;
    onSale: number;
    categories: number;
    brands: number;
  };
  users: {
    total: number;
    admins: number;
    newLast30Days: number;
  };
  visits: {
    last30Days: number;
    previous30Days: number;
    daily: TDailyCount[];
    byPageType: { pageType: PageType; count: number }[];
  };
  topProducts: {
    id: string;
    name: string;
    image: string | null;
    price: number;
    salePrice: number | null;
    visits: number;
  }[];
  recentProducts: {
    id: string;
    name: string;
    image: string | null;
    price: number;
    isAvailable: boolean;
    createdAt: Date;
  }[];
  health: {
    missingImages: number;
    missingDescription: number;
    singleImage: number;
  };
};

export type TAdminProduct = {
  id: string;
  name: string;
  images: string[];
  price: number;
  salePrice: number | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  brand: { id: string; name: string };
  category: { id: string; name: string };
  categoryPath: string;
};

export type TAdminBrand = {
  id: string;
  name: string;
  productCount: number;
};

export type TAdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  createdAt: Date;
};

export type TTrafficStats = {
  total: number;
  last30Days: number;
  daily: TDailyCount[];
  byPageType: { pageType: PageType; count: number }[];
  topPaths: { path: string; count: number }[];
};

export type TImageUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};
