import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

/** Server-side Stripe client, created on first use so the app still builds without keys. */
export const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(secretKey);
  return client;
};
