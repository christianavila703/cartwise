"use client";

import { OrderStatus } from "@prisma/client";
import { ChevronRight, Euro, ImageOff, ShoppingBag, Truck, Undo2 } from "lucide-react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getAdminOrders } from "@/actions/admin/orders";
import { countryName, formatCents } from "@/shared/constants/checkout";
import { ORDER_STATUS_META, REVENUE_STATUSES } from "@/shared/constants/orders";
import { TAdminOrder } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";

import { formatDateTime, formatNumber, productImageUrl } from "../../utils";
import { Badge } from "../ui/badge";
import { Card, StatCard } from "../ui/card";
import { AdminSelect, SearchInput } from "../ui/field";
import { EmptyState, PageHeader, Skeleton } from "../ui/misc";
import { useToast } from "../ui/toast";

import { OrderDrawer } from "./orderDrawer";

type TTab = "ALL" | OrderStatus;
type TPeriod = "all" | "7" | "30" | "90";

// unpaid orders are abandoned checkouts, so "All" leaves them out
const TABS: { key: TTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAID", label: "To ship" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "PENDING", label: "Unpaid" },
];

const matchesTab = (order: TAdminOrder, tab: TTab) => (tab === "ALL" ? order.status !== "PENDING" : order.status === tab);

export const OrdersView = () => {
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<TAdminOrder[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<TTab>(() => {
    const status = searchParams.get("status");
    return status && status in ORDER_STATUS_META ? (status as OrderStatus) : "ALL";
  });
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<TPeriod>("all");
  // start of the chosen period, set when the period changes (not during render)
  const [periodStart, setPeriodStart] = useState<number | null>(null);
  // the drawer is local state for instant open/close; the URL mirrors it so orders can be linked to
  const [openID, setOpenID] = useState<string | null>(() => searchParams.get("order"));

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const response = await getAdminOrders();
      if (ignore) return;
      if (response.res) setOrders(response.res);
      else toast.error(response.error ?? "Can't load orders");
    };
    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey, toast]);

  const openOrder = (id: string | null) => {
    setOpenID(id);
    window.history.replaceState(null, "", id ? `${pathname}?order=${id}` : pathname);
  };

  const changePeriod = (value: TPeriod) => {
    setPeriod(value);
    setPeriodStart(value === "all" ? null : Date.now() - Number(value) * 24 * 60 * 60 * 1000);
  };

  const inPeriod = useMemo(
    () =>
      periodStart === null
        ? (orders ?? [])
        : (orders ?? []).filter((order) => new Date(order.createdAt).getTime() >= periodStart),
    [orders, periodStart]
  );

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((item) => [item.key, inPeriod.filter((order) => matchesTab(order, item.key)).length])),
    [inPeriod]
  );

  const stats = useMemo(() => {
    const paid = inPeriod.filter((order) => REVENUE_STATUSES.includes(order.status));
    const revenue = paid.reduce((sum, order) => sum + order.totalCents, 0);
    return {
      revenue,
      paidOrders: paid.length,
      averageOrder: paid.length ? Math.round(revenue / paid.length) : 0,
      toShip: inPeriod.filter((order) => order.status === "PAID").length,
      refunded: inPeriod.filter((order) => order.status === "REFUNDED").reduce((sum, order) => sum + order.totalCents, 0),
    };
  }, [inPeriod]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/^#/, "");
    return inPeriod.filter(
      (order) =>
        matchesTab(order, tab) &&
        (!query || `${order.number} ${order.shippingName} ${order.email}`.toLowerCase().includes(query))
    );
  }, [inPeriod, tab, search]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track payments, ship orders and handle refunds."
        actions={
          <AdminSelect value={period} onChange={(e) => changePeriod(e.currentTarget.value as TPeriod)}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </AdminSelect>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={orders ? formatCents(stats.revenue) : "—"} icon={Euro} tone="emerald" />
        <StatCard
          label="Paid orders"
          value={orders ? formatNumber(stats.paidOrders) : "—"}
          icon={ShoppingBag}
          tone="brand"
          footer={orders ? `Average ${formatCents(stats.averageOrder)}` : undefined}
        />
        <StatCard
          label="Waiting to ship"
          value={orders ? formatNumber(stats.toShip) : "—"}
          icon={Truck}
          tone="amber"
        />
        <StatCard label="Refunded" value={orders ? formatCents(stats.refunded) : "—"} icon={Undo2} tone="violet" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1 sm:w-fit">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  tab === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-xs tabular-nums",
                    tab === item.key ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-500"
                  )}
                >
                  {counts[item.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="max-w-md">
            <SearchInput placeholder="Search by order number, name or email…" value={search} onValueChange={setSearch} />
          </div>
        </div>

        {orders === null ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : visibleOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={orders.length ? "No orders match your filters" : "No orders yet"}
            description={orders.length ? undefined : "Orders appear here as soon as customers check out."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Items</th>
                  <th className="px-3 py-3 font-medium">Total</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order.id)}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-slate-900 group-hover:text-brand-700">
                        #{order.number}
                      </span>
                      <span className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block max-w-[220px] truncate font-medium text-slate-800">
                        {order.shippingName}
                      </span>
                      <span className="block max-w-[220px] truncate text-xs text-slate-500">
                        {order.email} · {countryName(order.shippingCountry)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {order.images.map((image, index) => {
                            const src = productImageUrl(image);
                            return (
                              <span
                                key={index}
                                className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-2 ring-white"
                              >
                                {src ? (
                                  <Image src={src} alt="" fill sizes="32px" className="object-contain" />
                                ) : (
                                  <ImageOff className="size-3 text-slate-400" />
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-xs text-slate-500">
                          {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 tabular-nums">
                      {formatCents(order.totalCents)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={ORDER_STATUS_META[order.status].tone} dot>
                        {ORDER_STATUS_META[order.status].label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="ml-auto size-4 text-slate-300 group-hover:text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {orders !== null && visibleOrders.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {formatNumber(visibleOrders.length)} order{visibleOrders.length === 1 ? "" : "s"}
          </div>
        )}
      </Card>

      {openID && (
        <OrderDrawer
          key={openID}
          orderID={openID}
          onClose={() => openOrder(null)}
          onChanged={() => setReloadKey((key) => key + 1)}
        />
      )}
    </>
  );
};
