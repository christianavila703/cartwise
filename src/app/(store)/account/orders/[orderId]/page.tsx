import { ArrowLeft, ExternalLink, MapPin, Package, Truck } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderProgress, OrderStatusBadge } from "@/domains/store/account/components/orderStatus";
import { countryName, formatCents } from "@/shared/constants/checkout";
import { trackingUrl } from "@/shared/constants/orders";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getSession } from "@/shared/lib/auth";
import { getOrderSummary } from "@/shared/lib/orders";

export const metadata: Metadata = { title: "Order details — Cartwise" };
export const dynamic = "force-dynamic";

type TProps = { params: Promise<{ orderId: string }> };

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const OrderDetailPage = async ({ params }: TProps) => {
  const { orderId } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/account/orders/${orderId}`);

  // scoped to the signed-in customer, so nobody can open someone else's order
  const order = await getOrderSummary({ id: orderId, userId: session.user.id, paidAt: { not: null } });
  if (!order) notFound();

  const trackingLink = trackingUrl(order.trackingCarrier, order.trackingNumber);
  const statusNote = {
    PENDING: "",
    PAID: "We're preparing your order. It usually ships within 1–2 business days.",
    SHIPPED: "Your order is on its way and usually arrives within 2–5 business days.",
    DELIVERED: order.deliveredAt ? `Delivered on ${formatDate(order.deliveredAt)}.` : "Delivered.",
    CANCELLED: "This order was cancelled and nothing was charged.",
    REFUNDED: `This order was refunded${order.refundedAt ? ` on ${formatDate(order.refundedAt)}` : ""}. The money is returned to your card, which can take 5–10 business days.`,
  }[order.status];

  return (
    <div className="storeContainer">
      <div className="mx-auto mt-[160px] mb-24 w-full max-w-3xl">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="size-4" /> My orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-light text-gray-900">Order #{order.number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <OrderProgress order={order} />
          <p className="mt-5 text-center text-sm text-gray-600">{statusNote}</p>
          {order.trackingNumber && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <Truck className="size-4 text-gray-400" />
                {order.trackingCarrier} · <span className="font-mono">{order.trackingNumber}</span>
              </span>
              {trackingLink && (
                <a
                  href={trackingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Track parcel <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100 px-6">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {item.image ? (
                    <Image
                      src={IMAGE_BASE_URL + item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-contain p-1.5"
                    />
                  ) : (
                    <Package className="m-auto size-5 text-gray-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {item.productId ? (
                    <Link href={`/product/${item.productId}`} className="text-sm text-gray-800 hover:text-brand-700">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-800">{item.name}</span>
                  )}
                  <span className="block text-xs text-gray-500">
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
              <dt>Total</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <MapPin className="size-4 text-gray-400" /> Shipping address
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
        </section>
      </div>
    </div>
  );
};

export default OrderDetailPage;
