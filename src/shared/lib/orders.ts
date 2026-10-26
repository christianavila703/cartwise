import "server-only";

import { Prisma } from "@prisma/client";

import { MAX_QUANTITY_PER_ITEM, shippingForSubtotal, toCents } from "@/shared/constants/checkout";
import { db } from "@/shared/lib/db";
import { getStripe } from "@/shared/lib/stripe";
import { TCheckoutPreview, TOrderSummary } from "@/shared/types/checkout";
import { TCartItem } from "@/shared/types/shoppingCart";

/**
 * Prices a cart from the database. The browser only says which products and how many;
 * prices and availability always come from here.
 */
export const priceCart = async (items: TCartItem[]): Promise<TCheckoutPreview> => {
  // merge duplicate lines and clamp quantities
  const quantities = new Map<string, number>();
  items.forEach(({ productId, quantity }) => {
    if (typeof productId !== "string" || !Number.isFinite(quantity)) return;
    const merged = (quantities.get(productId) ?? 0) + Math.floor(quantity);
    quantities.set(productId, Math.min(MAX_QUANTITY_PER_ITEM, merged));
  });
  const productIDs = [...quantities.keys()].filter((id) => (quantities.get(id) ?? 0) > 0);

  const products = productIDs.length
    ? await db.product.findMany({
        where: { id: { in: productIDs } },
        select: { id: true, name: true, images: true, price: true, salePrice: true, isAvailable: true },
      })
    : [];

  const lines = productIDs.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) return [];
    const hasSale = product.salePrice !== null && product.salePrice < product.price;
    return [
      {
        productId: product.id,
        name: product.name,
        image: product.images[0] ?? null,
        unitPriceCents: toCents(hasSale ? product.salePrice! : product.price),
        originalPriceCents: hasSale ? toCents(product.price) : null,
        quantity: quantities.get(id)!,
        isAvailable: product.isAvailable,
      },
    ];
  });

  const subtotalCents = lines
    .filter((line) => line.isAvailable)
    .reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const shippingCents = shippingForSubtotal(subtotalCents);

  return {
    lines,
    missingProductIDs: productIDs.filter((id) => !products.some((product) => product.id === id)),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
};

/** Marks a pending order as paid. Safe to call more than once (success page and webhook both do). */
export const markOrderPaid = async (stripeSessionId: string, paymentIntentId: string | null) => {
  await db.order.updateMany({
    where: { stripeSessionId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: paymentIntentId },
  });
};

/** Cancels an order that was never paid. Paid orders are left untouched. */
export const markOrderCancelled = async (where: Prisma.OrderWhereInput) => {
  await db.order.updateMany({
    where: { ...where, status: "PENDING" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
};

/**
 * Brings an order in line with its Stripe Checkout session: paid sessions mark the order paid,
 * expired ones cancel it. Returns the session's payment state.
 */
export const syncOrderWithStripe = async (stripeSessionId: string) => {
  const checkoutSession = await getStripe().checkout.sessions.retrieve(stripeSessionId);
  const paymentIntentID =
    typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : (checkoutSession.payment_intent?.id ?? null);

  if (checkoutSession.payment_status === "paid" || checkoutSession.payment_status === "no_payment_required") {
    await markOrderPaid(stripeSessionId, paymentIntentID);
    return "paid" as const;
  }
  if (checkoutSession.status === "expired") {
    await markOrderCancelled({ stripeSessionId });
    return "expired" as const;
  }
  return "unpaid" as const;
};

const orderSummarySelect = {
  id: true,
  number: true,
  status: true,
  email: true,
  subtotalCents: true,
  shippingCents: true,
  totalCents: true,
  createdAt: true,
  paidAt: true,
  shippedAt: true,
  deliveredAt: true,
  cancelledAt: true,
  refundedAt: true,
  trackingCarrier: true,
  trackingNumber: true,
  shippingName: true,
  shippingPhone: true,
  shippingLine1: true,
  shippingLine2: true,
  shippingCity: true,
  shippingPostalCode: true,
  shippingCountry: true,
  items: { select: { id: true, productId: true, name: true, image: true, unitPriceCents: true, quantity: true } },
} satisfies Prisma.OrderSelect;

export const getOrderSummary = async (where: Prisma.OrderWhereInput): Promise<TOrderSummary | null> => {
  const order = await db.order.findFirst({ where, select: orderSummarySelect });
  return order ? toOrderSummary(order) : null;
};

export const getOrderSummaries = async (where: Prisma.OrderWhereInput): Promise<TOrderSummary[]> => {
  const orders = await db.order.findMany({ where, select: orderSummarySelect, orderBy: { createdAt: "desc" } });
  return orders.map(toOrderSummary);
};

const toOrderSummary = (order: Prisma.OrderGetPayload<{ select: typeof orderSummarySelect }>): TOrderSummary => {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    email: order.email,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    refundedAt: order.refundedAt,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    items: order.items,
    address: {
      name: order.shippingName,
      phone: order.shippingPhone ?? undefined,
      line1: order.shippingLine1,
      line2: order.shippingLine2 ?? undefined,
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
  };
};
