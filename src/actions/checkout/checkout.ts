"use server";

import { headers } from "next/headers";
import Stripe from "stripe";
import { z } from "zod";

import { CURRENCY, MAX_QUANTITY_PER_ITEM, SHIPPING_COUNTRIES } from "@/shared/constants/checkout";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getSession } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { markOrderCancelled, priceCart, syncOrderWithStripe } from "@/shared/lib/orders";
import { getStripe, isStripeConfigured } from "@/shared/lib/stripe";
import { TCheckoutRequest } from "@/shared/types/checkout";
import { TCartItem } from "@/shared/types/shoppingCart";

const CartItems = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
    })
  )
  .min(1, "Your cart is empty")
  .max(50);

const countryCodes = SHIPPING_COUNTRIES.map((country) => country.code) as [string, ...string[]];

const ShippingAddress = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d\s()-]*$/, "Enter a valid phone number")
    .optional(),
  line1: z.string().trim().min(3, "Enter your street address").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, "Enter your city").max(100),
  postalCode: z.string().trim().min(2, "Enter your postal code").max(20),
  country: z.enum(countryCodes, { message: "Choose a country we ship to" }),
});

const CheckoutRequest = z.object({ items: CartItems, address: ShippingAddress });

/** Prices the cart for the checkout page. Public, like the cart drawer itself. */
export const getCheckoutPreview = async (items: TCartItem[]) => {
  const parsed = CartItems.safeParse(items);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    return { res: await priceCart(parsed.data) };
  } catch {
    return { error: "Can't load your cart" };
  }
};

const getOrigin = async () => {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL ?? "http://localhost:3000");
};

// Stripe only shows images reachable over https
const toStripeImage = (path: string | null) => {
  if (!path) return [];
  const url = path.startsWith("http") ? path : IMAGE_BASE_URL + path;
  return url.startsWith("https://") ? [url] : [];
};

/**
 * Creates a pending order from the cart and a Stripe Checkout session for it.
 * Returns the Stripe URL the browser should go to.
 */
export const createCheckout = async (request: TCheckoutRequest) => {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return { error: "Please sign in to check out" };
  if (!isStripeConfigured()) return { error: "Payments are not configured yet (STRIPE_SECRET_KEY is missing)" };

  const parsed = CheckoutRequest.safeParse(request);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { items, address } = parsed.data;

  let orderID: string | null = null;
  try {
    const preview = await priceCart(items);
    const unavailable = preview.lines.filter((line) => !line.isAvailable);
    if (preview.missingProductIDs.length) return { error: "Some products in your cart no longer exist" };
    if (unavailable.length) return { error: `${unavailable[0].name} is out of stock` };
    if (!preview.lines.length) return { error: "Your cart is empty" };

    const order = await db.order.create({
      data: {
        userId: session.user.id,
        email: session.user.email,
        subtotalCents: preview.subtotalCents,
        shippingCents: preview.shippingCents,
        totalCents: preview.totalCents,
        currency: CURRENCY,
        shippingName: address.name,
        shippingPhone: address.phone || null,
        shippingLine1: address.line1,
        shippingLine2: address.line2 || null,
        shippingCity: address.city,
        shippingPostalCode: address.postalCode,
        shippingCountry: address.country,
        items: {
          create: preview.lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            image: line.image,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
          })),
        },
      },
      select: { id: true, number: true },
    });
    orderID = order.id;

    const origin = await getOrigin();
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: String(order.number) },
      line_items: preview.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: line.unitPriceCents,
          product_data: { name: line.name, images: toStripeImage(line.image) },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: preview.shippingCents ? "Standard shipping" : "Free shipping",
            fixed_amount: { amount: preview.shippingCents, currency: CURRENCY },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 2 },
              maximum: { unit: "business_day", value: 5 },
            },
          },
        },
      ],
      // the shortest expiry Stripe allows; unpaid orders are cancelled when it passes
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=${order.id}`,
    });

    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: checkoutSession.id } });
    if (!checkoutSession.url) throw new Error("Stripe did not return a checkout URL");
    return { res: { url: checkoutSession.url } };
  } catch (error) {
    if (orderID) await markOrderCancelled({ id: orderID }).catch(() => {});
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return { error: "Payments are misconfigured (invalid Stripe key)" };
    }
    return { error: "Can't start the payment, please try again" };
  }
};

/** Called when the customer comes back from Stripe without paying. */
export const cancelCheckout = async (orderID: string) => {
  const session = await getSession();
  if (!session?.user?.id || !orderID) return { error: "Invalid Data!" };

  try {
    const order = await db.order.findFirst({
      where: { id: orderID, userId: session.user.id, status: "PENDING" },
      select: { id: true, stripeSessionId: true },
    });
    if (!order) return { res: false };

    if (order.stripeSessionId && isStripeConfigured()) {
      // never cancel an order that was paid in the meantime (e.g. in another tab)
      if ((await syncOrderWithStripe(order.stripeSessionId)) === "paid") return { res: false };
      // stop the abandoned session from being paid later
      await getStripe()
        .checkout.sessions.expire(order.stripeSessionId)
        .catch(() => {});
    }
    await markOrderCancelled({ id: order.id });
    return { res: true };
  } catch {
    return { error: "Can't cancel the order" };
  }
};
