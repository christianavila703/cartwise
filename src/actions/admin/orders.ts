"use server";

import { OrderStatus } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";

import { REFUNDABLE_STATUSES } from "@/shared/constants/orders";
import { isAdmin, UNAUTHORIZED } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { getOrderSummary, markOrderCancelled, settleStaleCheckouts } from "@/shared/lib/orders";
import { releaseStock } from "@/shared/lib/stock";
import { getStripe, isStripeConfigured } from "@/shared/lib/stripe";
import { TAdminOrder, TAdminOrderDetail } from "@/shared/types/admin";

export const getAdminOrders = async () => {
  if (!(await isAdmin())) return UNAUTHORIZED;

  try {
    // abandoned checkouts are settled first, so the list shows their real state
    await settleStaleCheckouts().catch(() => {});
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        number: true,
        status: true,
        email: true,
        shippingName: true,
        shippingCountry: true,
        totalCents: true,
        createdAt: true,
        items: { select: { quantity: true, image: true } },
      },
    });
    const result: TAdminOrder[] = orders.map(({ items, ...order }) => ({
      ...order,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      images: items.map((item) => item.image).slice(0, 3),
    }));
    return { res: result };
  } catch {
    return { error: "Can't load orders" };
  }
};

export const getAdminOrder = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Invalid Data!" };

  try {
    const [summary, extra] = await Promise.all([
      getOrderSummary({ id }),
      db.order.findUnique({
        where: { id },
        select: {
          stripePaymentIntentId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              // abandoned checkouts aren't real orders
              _count: { select: { orders: { where: { status: { not: "PENDING" } } } } },
            },
          },
        },
      }),
    ]);
    if (!summary || !extra) return { error: "Order not found" };

    const isTestMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
    const result: TAdminOrderDetail = {
      ...summary,
      stripePaymentIntentId: extra.stripePaymentIntentId,
      stripeDashboardUrl: extra.stripePaymentIntentId
        ? `https://dashboard.stripe.com/${isTestMode ? "test/" : ""}payments/${extra.stripePaymentIntentId}`
        : null,
      customer: {
        id: extra.user.id,
        name: extra.user.name,
        email: extra.user.email,
        orderCount: extra.user._count.orders,
      },
    };
    return { res: result };
  } catch {
    return { error: "Can't load the order" };
  }
};

const Tracking = z.object({
  carrier: z.string().trim().max(40).optional(),
  number: z.string().trim().max(80).optional(),
});

/** Moves an order one step forward. Only applies when the order is still in the expected status. */
const transition = async (id: string, from: OrderStatus[], data: Parameters<typeof db.order.updateMany>[0]["data"]) => {
  const result = await db.order.updateMany({ where: { id, status: { in: from } }, data });
  return result.count === 1;
};

export const markOrderShipped = async (id: string, tracking: { carrier?: string; number?: string }) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = Tracking.safeParse(tracking);
  if (!id || !parsed.success) return { error: "Invalid Data!" };

  try {
    const updated = await transition(id, ["PAID"], {
      status: "SHIPPED",
      shippedAt: new Date(),
      trackingCarrier: parsed.data.carrier || null,
      trackingNumber: parsed.data.number || null,
    });
    return updated ? { res: true } : { error: "Only paid orders can be shipped" };
  } catch {
    return { error: "Can't update the order" };
  }
};

export const updateOrderTracking = async (id: string, tracking: { carrier?: string; number?: string }) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  const parsed = Tracking.safeParse(tracking);
  if (!id || !parsed.success) return { error: "Invalid Data!" };

  try {
    const updated = await transition(id, ["SHIPPED", "DELIVERED"], {
      trackingCarrier: parsed.data.carrier || null,
      trackingNumber: parsed.data.number || null,
    });
    return updated ? { res: true } : { error: "Tracking can only be set on shipped orders" };
  } catch {
    return { error: "Can't update the order" };
  }
};

export const markOrderDelivered = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Invalid Data!" };

  try {
    const updated = await transition(id, ["SHIPPED"], { status: "DELIVERED", deliveredAt: new Date() });
    return updated ? { res: true } : { error: "Only shipped orders can be marked as delivered" };
  } catch {
    return { error: "Can't update the order" };
  }
};

/** Cancels an order that was never paid. Paid orders are refunded instead. */
export const cancelUnpaidOrder = async (id: string) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Invalid Data!" };

  try {
    const order = await db.order.findUnique({ where: { id }, select: { status: true, stripeSessionId: true } });
    if (order?.status !== "PENDING") return { error: "Only unpaid orders can be cancelled" };
    if (order.stripeSessionId && isStripeConfigured()) {
      // close the payment page so it can't be paid after cancelling
      await getStripe()
        .checkout.sessions.expire(order.stripeSessionId)
        .catch(() => {});
    }
    // cancels and releases the reserved stock in one step
    await markOrderCancelled({ id });
    return { res: true };
  } catch {
    return { error: "Can't cancel the order" };
  }
};

/**
 * Refunds the full payment through Stripe and marks the order refunded.
 * `restock` puts the items back into stock (e.g. returned unopened); leave it off for lost or damaged goods.
 */
export const refundOrder = async (id: string, restock: boolean) => {
  if (!(await isAdmin())) return UNAUTHORIZED;
  if (!id) return { error: "Invalid Data!" };
  if (!isStripeConfigured()) return { error: "Stripe is not configured" };

  try {
    const order = await db.order.findUnique({ where: { id }, select: { status: true, stripePaymentIntentId: true } });
    if (!order || !REFUNDABLE_STATUSES.includes(order.status)) return { error: "This order can't be refunded" };
    if (!order.stripePaymentIntentId) return { error: "No Stripe payment found for this order" };

    try {
      // the idempotency key makes a double click refund only once
      await getStripe().refunds.create(
        { payment_intent: order.stripePaymentIntentId, reason: "requested_by_customer", metadata: { orderId: id } },
        { idempotencyKey: `refund-${id}` }
      );
    } catch (error) {
      // already refunded in the Stripe dashboard: just record it
      if (!(error instanceof Stripe.errors.StripeError && error.code === "charge_already_refunded")) throw error;
    }
    // status and restock change together, so a retried refund can't restock twice
    await db.$transaction(
      async (tx) => {
        const { count } = await tx.order.updateMany({
          where: { id, status: { in: REFUNDABLE_STATUSES } },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
        if (count === 1 && restock) {
          const items = await tx.orderItem.findMany({ where: { orderId: id }, select: { productId: true, quantity: true } });
          await releaseStock(tx, items);
        }
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
    return { res: true };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) return { error: `Stripe: ${error.message}` };
    return { error: "Can't refund the order" };
  }
};
