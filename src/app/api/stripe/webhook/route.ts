import { NextResponse } from "next/server";
import Stripe from "stripe";

import { REFUNDABLE_STATUSES } from "@/shared/constants/orders";
import { db } from "@/shared/lib/db";
import { markOrderCancelled, markOrderPaid } from "@/shared/lib/orders";
import { getStripe } from "@/shared/lib/stripe";

// Stripe calls this after payment events. The signature check proves the request really came from Stripe.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // the raw body is required for signature verification
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          const paymentIntentID =
            typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
          await markOrderPaid(session.id, paymentIntentID);
        }
        break;
      }
      case "charge.refunded": {
        // refunds made in the Stripe dashboard
        const charge = event.data.object;
        const paymentIntentID = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (charge.refunded && paymentIntentID) {
          await db.order.updateMany({
            where: { stripePaymentIntentId: paymentIntentID, status: { in: REFUNDABLE_STATUSES } },
            data: { status: "REFUNDED", refundedAt: new Date() },
          });
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await markOrderCancelled({ stripeSessionId: event.data.object.id });
        break;
    }
  } catch {
    // a 500 makes Stripe retry the event later
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
