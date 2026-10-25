import { CheckCircle2, Clock, Mail, Package, XCircle } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClearCart } from "@/domains/store/checkout/components/clearCart";
import { countryName, formatCents } from "@/shared/constants/checkout";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getSession } from "@/shared/lib/auth";
import { getOrderSummary, syncOrderWithStripe } from "@/shared/lib/orders";
import { isStripeConfigured } from "@/shared/lib/stripe";

export const metadata: Metadata = { title: "Order confirmed — Cartwise" };

type TProps = { searchParams: Promise<{ session_id?: string }> };

const CheckoutSuccessPage = async ({ searchParams }: TProps) => {
  const { session_id: sessionID } = await searchParams;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/");
  if (!sessionID) notFound();

  const where = { stripeSessionId: sessionID, userId: session.user.id };
  let order = await getOrderSummary(where);
  if (!order) notFound();

  // confirm with Stripe directly, so this works even before (or without) the webhook
  if (order.status === "PENDING" && isStripeConfigured()) {
    await syncOrderWithStripe(sessionID).catch(() => null);
    order = (await getOrderSummary(where)) ?? order;
  }

  const isPaid = order.status !== "PENDING" && order.status !== "CANCELLED";
  const isCancelled = order.status === "CANCELLED";
  const StatusIcon = isPaid ? CheckCircle2 : isCancelled ? XCircle : Clock;

  return (
    <div className="storeContainer">
      {isPaid && <ClearCart />}
      <div className="mx-auto mt-[160px] mb-24 w-full max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <span
            className={
              isPaid
                ? "flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50"
                : isCancelled
                  ? "flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600"
                  : "flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"
            }
          >
            <StatusIcon className="size-8" />
          </span>
          <p className="mt-6 text-sm font-medium text-gray-500">Order #{order.number}</p>
          <h1 className="mt-1 text-3xl font-light text-gray-900">
            {isPaid ? "Thank you for your order!" : isCancelled ? "This order was cancelled" : "Payment is processing"}
          </h1>
          <p className="mt-3 max-w-md text-sm text-gray-500">
            {isPaid ? (
              <>
                We&apos;ve received your payment and will start preparing your order. Keep order number{" "}
                <span className="font-medium text-gray-700">#{order.number}</span> for reference.
              </>
            ) : isCancelled ? (
              "The payment wasn't completed, so nothing was charged."
            ) : (
              "We're waiting for the payment to be confirmed. This page updates when you refresh it."
            )}
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100 px-6">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {item.image && (
                    <Image
                      src={IMAGE_BASE_URL + item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-contain p-1.5"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-800">{item.name}</span>
                  <span className="text-xs text-gray-500">
                    {item.quantity} × {formatCents(item.unitPriceCents)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCents(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-gray-100 px-6 py-5 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Subtotal</dt>
              <dd>{formatCents(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Shipping</dt>
              <dd>{order.shippingCents ? formatCents(order.shippingCents) : "Free"}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
              <dt>{isPaid ? "Total paid" : "Total"}</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Package className="size-4 text-gray-400" /> Shipping to
            </p>
            <address className="mt-2 text-sm leading-relaxed text-gray-600 not-italic">
              {order.address.name}
              <br />
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.postalCode} {order.address.city}
              <br />
              {countryName(order.address.country)}
            </address>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Mail className="size-4 text-gray-400" /> What happens next
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {isPaid
                ? "Your order ships within 1–2 business days and usually arrives in 2–5 business days."
                : "Once the payment is confirmed we'll prepare your order."}
            </p>
          </div>
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
