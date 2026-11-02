import { OrderStatus } from "@prisma/client";
import { CheckCircle2, ChevronRight, ExternalLink, Package, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BuyAgainButton } from "@/domains/store/account/components/buyAgainButton";
import { formatCents } from "@/shared/constants/checkout";
import { trackingUrl } from "@/shared/constants/orders";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getSession } from "@/shared/lib/auth";
import { getOrderSummaries } from "@/shared/lib/orders";
import { TOrderSummary } from "@/shared/types/checkout";
import { cn } from "@/shared/utils/styling";

export const metadata: Metadata = { title: "My orders — Cartwise" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All orders", statuses: null },
  { key: "active", label: "In progress", statuses: ["PAID", "SHIPPED"] },
  { key: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
  { key: "refunded", label: "Refunded", statuses: ["REFUNDED"] },
] as const satisfies { key: string; label: string; statuses: OrderStatus[] | null }[];

type TTabKey = (typeof TABS)[number]["key"];

const formatDate = (date: Date, withYear = true) =>
  new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });

/** The headline of an order card: what's happening with it right now. */
const statusLine = (order: TOrderSummary) => {
  switch (order.status) {
    case "PAID":
      return {
        icon: Package,
        tone: "text-amber-700 bg-amber-50",
        title: "Preparing your order",
        detail: "Usually ships within 1–2 business days",
      };
    case "SHIPPED":
      return {
        icon: Truck,
        tone: "text-brand-700 bg-brand-50",
        title: "On its way",
        detail: order.trackingNumber
          ? `${order.trackingCarrier ?? "Tracking"} · ${order.trackingNumber}`
          : `Shipped ${order.shippedAt ? formatDate(order.shippedAt, false) : ""}, arrives in 2–5 business days`,
      };
    case "DELIVERED":
      return {
        icon: CheckCircle2,
        tone: "text-emerald-700 bg-emerald-50",
        title: `Delivered${order.deliveredAt ? ` on ${formatDate(order.deliveredAt, false)}` : ""}`,
        detail: "Thanks for shopping with Cartwise",
      };
    default:
      return {
        icon: RotateCcw,
        tone: "text-violet-700 bg-violet-50",
        title: `Refunded${order.refundedAt ? ` on ${formatDate(order.refundedAt, false)}` : ""}`,
        detail: "The money goes back to your card within 5–10 business days",
      };
  }
};

type TProps = { searchParams: Promise<{ status?: string }> };

const MyOrdersPage = async ({ searchParams }: TProps) => {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/orders");

  const { status } = await searchParams;
  const tab: TTabKey = TABS.some((item) => item.key === status) ? (status as TTabKey) : "all";

  // only orders that were paid: unpaid checkouts that were abandoned or expired aren't purchases
  const orders = await getOrderSummaries({ userId: session.user.id, paidAt: { not: null } });

  const inTab = (key: TTabKey) => {
    const statuses = TABS.find((item) => item.key === key)!.statuses as readonly OrderStatus[] | null;
    return statuses ? orders.filter((order) => statuses.includes(order.status)) : orders;
  };
  const visible = inTab(tab);

  return (
    <div className="storeContainer">
      <div className="mx-auto mt-[160px] mb-24 w-full max-w-4xl">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-light text-gray-900">My orders</h1>
          <p className="text-sm text-gray-500">
            {orders.length
              ? `${orders.length} order${orders.length === 1 ? "" : "s"} · track deliveries and buy your favorites again`
              : "Track your purchases and see past orders."}
          </p>
        </div>

        {orders.length > 0 && (
          <nav
            className="mt-6 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-gray-200)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Order status"
          >
            {/* the grey line is an inset shadow, so the active tab's underline covers it without overflowing
                (a 1px overflow here showed a vertical scrollbar) */}
            {TABS.map((item) => {
              const count = inTab(item.key).length;
              const isActive = item.key === tab;
              return (
                <Link
                  key={item.key}
                  href={item.key === "all" ? "/account/orders" : `/account/orders?status=${item.key}`}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-3 text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "border-gray-900 font-medium text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {visible.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <ShoppingBag className="size-7 text-gray-400" />
            </span>
            <h2 className="mt-5 text-lg font-medium text-gray-900">
              {orders.length ? "No orders here" : "No orders yet"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {orders.length ? "Orders with this status will show up here." : "When you buy something, you can follow it here."}
            </p>
            <Link
              href={orders.length ? "/account/orders" : "/"}
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {orders.length ? "See all orders" : "Start shopping"}
            </Link>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-5">
            {visible.map((order) => {
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const line = statusLine(order);
              const StatusIcon = line.icon;
              const trackLink = order.status === "SHIPPED" ? trackingUrl(order.trackingCarrier, order.trackingNumber) : null;
              const shown = order.items.slice(0, 4);
              const hidden = order.items.length - shown.length;

              return (
                <li key={order.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  {/* summary strip */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Order placed</p>
                      <p className="font-medium text-gray-800">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-medium text-gray-800">{formatCents(order.totalCents)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Items</p>
                      <p className="font-medium text-gray-800">{itemCount}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-gray-500">Order #{order.number}</p>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="inline-flex items-center gap-0.5 font-medium text-brand-600 hover:text-brand-700"
                      >
                        View details <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      {/* status */}
                      <div className="flex items-center gap-3">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", line.tone)}>
                          <StatusIcon className="size-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{line.title}</p>
                          <p className="truncate text-sm text-gray-500">{line.detail}</p>
                        </div>
                      </div>

                      {/* items */}
                      <ul className="mt-4 flex flex-wrap gap-3">
                        {shown.map((item) => (
                          <li key={item.id} className="flex max-w-[240px] items-center gap-3">
                            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                              {item.image ? (
                                <Image
                                  src={IMAGE_BASE_URL + item.image}
                                  alt={item.name}
                                  fill
                                  sizes="56px"
                                  className="object-contain p-1.5"
                                />
                              ) : (
                                <Package className="m-auto mt-4 size-5 text-gray-300" />
                              )}
                              {item.quantity > 1 && (
                                <span className="absolute top-0 right-0 rounded-bl-lg bg-gray-800 px-1.5 text-[11px] font-semibold text-white">
                                  ×{item.quantity}
                                </span>
                              )}
                            </span>
                            {order.items.length <= 2 &&
                              (item.productId ? (
                                <Link
                                  href={`/product/${item.productId}`}
                                  className="line-clamp-2 text-sm text-gray-700 hover:text-brand-700"
                                >
                                  {item.name}
                                </Link>
                              ) : (
                                <span className="line-clamp-2 text-sm text-gray-700">{item.name}</span>
                              ))}
                          </li>
                        ))}
                        {hidden > 0 && (
                          <li className="flex size-14 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500">
                            +{hidden}
                          </li>
                        )}
                      </ul>
                      {order.items.length > 2 && (
                        <p className="mt-2 truncate text-sm text-gray-500">
                          {order.items.map((item) => item.name).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* actions */}
                    <div className="flex shrink-0 flex-row flex-wrap gap-2 md:w-44 md:flex-col">
                      {trackLink && (
                        <a
                          href={trackLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                        >
                          <Truck className="size-4" /> Track parcel
                          <ExternalLink className="size-3.5 opacity-70" />
                        </a>
                      )}
                      <BuyAgainButton items={order.items} className="justify-center" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
