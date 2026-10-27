import { OrderStatus, PageType, Role } from "@prisma/client";

import { TOrderSummary } from "./checkout";

export type TDailyCount = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type TDashboardData = {
  sales: {
    revenueLast30Days: number;
    revenuePrevious30Days: number;
    ordersLast30Days: number;
    ordersPrevious30Days: number;
    awaitingShipment: number;
    dailyRevenue: TDailyCount[];
  };
  recentOrders: {
    id: string;
    number: number;
    status: OrderStatus;
    shippingName: string;
    totalCents: number;
    createdAt: Date;
  }[];
  catalog: {
    products: number;
    inStock: number;
    outOfStock: number;
    lowStock: number;
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
  stock: number;
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

export type TAdminOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  email: string;
  shippingName: string;
  shippingCountry: string;
  totalCents: number;
  createdAt: Date;
  itemCount: number;
  images: (string | null)[];
};

export type TAdminOrderDetail = TOrderSummary & {
  stripePaymentIntentId: string | null;
  /** link to the payment in the Stripe dashboard */
  stripeDashboardUrl: string | null;
  customer: { id: string; name: string | null; email: string | null; orderCount: number };
};

export type TImageUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};
