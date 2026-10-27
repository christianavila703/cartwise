import "server-only";

import { Prisma } from "@prisma/client";

import { MAX_QUANTITY_PER_ITEM, shippingForSubtotal, toCents } from "@/shared/constants/checkout";
import { db } from "@/shared/lib/db";
import { releaseStock } from "@/shared/lib/stock";
import { getStripe, isStripeConfigured } from "@/shared/lib/stripe";
import { TCheckoutPreview, TOrderSummary } from "@/shared/types/checkout";
import { TCartItem } from "@/shared/types/shoppingCart";

/**
 * Prices a cart from the database. The browser only says which products and how many;
 * prices and availability always come from here.
 * With `customerID`, units that customer holds in their own unpaid checkouts count as available to them,
 * because starting a new checkout releases those first.
 */
export const priceCart = async (items: TCartItem[], customerID?: string): Promise<TCheckoutPreview> => {
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
        select: { id: true, name: true, images: true, price: true, salePrice: true, stock: true },
      })
    : [];

  const ownReservations = customerID
    ? await db.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { in: productIDs }, order: { userId: customerID, status: "PENDING" } },
        _sum: { quantity: true },
      })
    : [];
  const reservedByCustomer = (id: string) =>
    ownReservations.find((row) => row.productId === id)?._sum.quantity ?? 0;

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
        stock: product.stock + reservedByCustomer(id),
        isAvailable: product.stock + reservedByCustomer(id) > 0,
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

/**
 * Cancels an unpaid order and returns its reserved stock. The status change and the restock happen
 * together and only once, so retries (webhook + success page + cleanup) never restock twice.
 */
const cancelPendingOrder = async (orderID: string) =>
  db.$transaction(
    async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderID, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      if (count === 0) return false;
      const items = await tx.orderItem.findMany({ where: { orderId: orderID }, select: { productId: true, quantity: true } });
      await releaseStock(tx, items);
      return true;
    },
    { maxWait: 10_000, timeout: 30_000 }
  );

/** Cancels orders that were never paid and releases their stock. Paid orders are left untouched. */
export const markOrderCancelled = async (where: Prisma.OrderWhereInput) => {
  const orders = await db.order.findMany({ where: { ...where, status: "PENDING" }, select: { id: true } });
  for (const order of orders) await cancelPendingOrder(order.id);
};

// Stripe Checkout sessions expire after 30 minutes; after that an unpaid order can never be paid
const STALE_PENDING_MS = 35 * 60 * 1000;

/** Settles one unpaid checkout: marks it paid if Stripe says so, otherwise closes it and releases its stock. */
const settleCheckout = async (order: { id: string; stripeSessionId: string | null }) => {
  if (order.stripeSessionId && isStripeConfigured()) {
    const state = await syncOrderWithStripe(order.stripeSessionId);
    if (state === "paid") return;
    if (state === "unpaid") await getStripe().checkout.sessions.expire(order.stripeSessionId).catch(() => {});
  }
  await cancelPendingOrder(order.id);
};

/**
 * A customer can only pay for one checkout at a time, so starting a new one settles their earlier unpaid
 * checkouts (e.g. after leaving Stripe with the browser's back button) and frees the stock they held.
 */
export const settleCustomerCheckouts = async (userID: string) => {
  const open = await db.order.findMany({
    where: { userId: userID, status: "PENDING" },
    select: { id: true, stripeSessionId: true },
  });
  for (const order of open) await settleCheckout(order);
};

/**
 * Settles unpaid checkouts older than their payment page: paid ones are marked paid, the rest are
 * cancelled so their reserved stock is sold again. Covers environments without the Stripe webhook.
 */
export const settleStaleCheckouts = async () => {
  const stale = await db.order.findMany({
    where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - STALE_PENDING_MS) } },
    select: { id: true, stripeSessionId: true },
    take: 20,
  });
  for (const order of stale) {
    try {
      await settleCheckout(order);
    } catch {
      // try again on the next run
    }
  }
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
