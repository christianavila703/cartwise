import { ChevronRight, Package, ShoppingBag } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderStatusBadge } from "@/domains/store/account/components/orderStatus";
import { formatCents } from "@/shared/constants/checkout";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getSession } from "@/shared/lib/auth";
import { getOrderSummaries } from "@/shared/lib/orders";

export const metadata: Metadata = { title: "My orders — Cartwise" };
export const dynamic = "force-dynamic";

const MyOrdersPage = async () => {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/orders");

  // unpaid orders are abandoned checkouts, so customers only see real purchases
  const orders = await getOrderSummaries({ userId: session.user.id, status: { not: "PENDING" } });

  return (
    <div className="storeContainer">
      <div className="mx-auto mt-[160px] mb-24 w-full max-w-3xl">
        <h1 className="text-3xl font-light text-gray-900">My orders</h1>
        <p className="mt-1 text-sm text-gray-500">Track your purchases and see past orders.</p>

        {orders.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <ShoppingBag className="size-7 text-gray-400" />
            </span>
            <h2 className="mt-5 text-lg font-medium text-gray-900">No orders yet</h2>
            <p className="mt-1 text-sm text-gray-500">When you buy something, you can follow it here.</p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {orders.map((order) => {
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="group flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="flex -space-x-3">
                      {order.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="relative size-16 overflow-hidden rounded-xl border border-gray-200 bg-white ring-2 ring-white"
                        >
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
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">Order #{order.number}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {order.items.map((item) => item.name).join(", ")}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        · {itemCount} item{itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-lg font-semibold text-gray-900">{formatCents(order.totalCents)}</span>
                      <ChevronRight className="size-5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                    </div>
                  </Link>
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
