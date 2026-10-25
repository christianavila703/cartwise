import { OrderStatus } from "@prisma/client";

import { TCartItem } from "./shoppingCart";

export type TCheckoutLine = {
  productId: string;
  name: string;
  image: string | null;
  unitPriceCents: number;
  /** original price when the product is on sale */
  originalPriceCents: number | null;
  quantity: number;
  isAvailable: boolean;
};

export type TCheckoutPreview = {
  lines: TCheckoutLine[];
  /** cart entries whose product no longer exists */
  missingProductIDs: string[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

export type TShippingAddress = {
  name: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
};

export type TCheckoutRequest = {
  items: TCartItem[];
  address: TShippingAddress;
};

export type TOrderSummary = {
  id: string;
  number: number;
  status: OrderStatus;
  email: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: Date;
  paidAt: Date | null;
  address: TShippingAddress;
  items: { id: string; productId: string | null; name: string; image: string | null; unitPriceCents: number; quantity: number }[];
};
