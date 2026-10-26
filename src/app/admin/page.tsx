import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Euro,
  Eye,
  FolderTree,
  ImageOff,
  Package,
  PackagePlus,
  Receipt,
  ShoppingBag,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getDashboardData } from "@/actions/admin/dashboard";
import { PerformanceChart } from "@/domains/admin/components/dashboard/performanceChart";
import { Badge } from "@/domains/admin/components/ui/badge";
import { Card, CardHeader, StatCard } from "@/domains/admin/components/ui/card";
import { BarList } from "@/domains/admin/components/ui/charts";
import { EmptyState } from "@/domains/admin/components/ui/misc";
import { formatNumber, formatPrice, percentChange, productImageUrl, timeAgo } from "@/domains/admin/utils";
import { formatCents } from "@/shared/constants/checkout";
import { ORDER_STATUS_META } from "@/shared/constants/orders";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const PAGE_TYPE_LABELS = { MAIN: "Homepage", LIST: "Product lists", PRODUCT: "Product pages" } as const;
const PAGE_TYPE_TONES = { MAIN: "bg-brand-500", LIST: "bg-violet-500", PRODUCT: "bg-emerald-500" } as const;

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const ProductThumb = ({ src, alt }: { src: string | null; alt: string }) => (
  <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
    {src ? (
      <Image src={src} alt={alt} fill sizes="44px" className="object-cover" />
    ) : (
      <ImageOff className="size-4 text-slate-400" />
    )}
  </span>
);

const AdminDashboard = async () => {
  const response = await getDashboardData();

  if (!response.res) {
    return (
      <Card>
        <EmptyState icon={AlertTriangle} title="Dashboard unavailable" description={response.error} />
      </Card>
    );
  }

  const { sales, recentOrders, catalog, users, visits, topProducts, health } = response.res;
  const revenueTrend = percentChange(sales.revenueLast30Days, sales.revenuePrevious30Days);
  const ordersTrend = percentChange(sales.ordersLast30Days, sales.ordersPrevious30Days);
  const averageOrder = sales.ordersLast30Days ? Math.round(sales.revenueLast30Days / sales.ordersLast30Days) : 0;
  const productsLabel = (count: number, single: string, plural: string) =>
    count === 1 ? `product ${single}` : `products ${plural}`;
  const healthIssues = [
    {
      count: catalog.outOfStock,
      label: productsLabel(catalog.outOfStock, "is out of stock", "are out of stock"),
      tone: "warning" as const,
    },
    {
      count: health.missingImages,
      label: productsLabel(health.missingImages, "has no images", "have no images"),
      tone: "danger" as const,
    },
    {
      count: health.singleImage,
      label: productsLabel(health.singleImage, "has only one image", "have only one image"),
      tone: "warning" as const,
    },
    {
      count: health.missingDescription,
      label: productsLabel(health.missingDescription, "has no description", "have no description"),
      tone: "warning" as const,
    },
  ].filter((issue) => issue.count > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0b1120] px-8 py-9 text-white shadow-xl shadow-slate-950/10">
        <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-300">{greeting()} 👋</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Here&apos;s how Cartwise is doing</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {formatCents(sales.revenueLast30Days)} from {formatNumber(sales.ordersLast30Days)} order
              {sales.ordersLast30Days === 1 ? "" : "s"} in the last 30 days.{" "}
              {sales.awaitingShipment > 0
                ? `${sales.awaitingShipment} order${sales.awaitingShipment === 1 ? " is" : "s are"} waiting to ship.`
                : "Every paid order has shipped."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/orders?status=PAID"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Truck className="size-4" /> Ship orders
            </Link>
            <Link
              href="/admin/products?new=1"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15"
            >
              <PackagePlus className="size-4" /> Add product
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className="animate-admin-rise"
          label="Revenue · 30 days"
          value={formatCents(sales.revenueLast30Days)}
          icon={Euro}
          tone="emerald"
          trend={revenueTrend}
          footer={revenueTrend === null ? "No earlier sales to compare" : "vs previous 30 days"}
        />
        <StatCard
          className="animate-admin-rise [animation-delay:60ms]"
          label="Orders · 30 days"
          value={formatNumber(sales.ordersLast30Days)}
          icon={ShoppingBag}
          tone="brand"
          trend={ordersTrend}
          footer={ordersTrend === null ? "No earlier orders to compare" : "vs previous 30 days"}
        />
        <StatCard
          className="animate-admin-rise [animation-delay:120ms]"
          label="Average order"
          value={formatCents(averageOrder)}
          icon={Receipt}
          tone="violet"
          footer="Last 30 days"
        />
        <StatCard
          className="animate-admin-rise [animation-delay:180ms]"
          label="Waiting to ship"
          value={formatNumber(sales.awaitingShipment)}
          icon={Truck}
          tone="amber"
          footer={
            <Link href="/admin/orders?status=PAID" className="font-medium text-brand-600 hover:text-brand-700">
              Go to orders →
            </Link>
          }
        />
      </section>

      {/* performance */}
      <section className="grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Performance" description="Daily revenue and store visits over the last 30 days" />
          <div className="px-4 pb-4">
            <PerformanceChart revenue={sales.dailyRevenue} visits={visits.daily} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Store at a glance" description="Visits by page type, last 30 days" />
          <div className="px-6 pb-6">
            <BarList
              items={visits.byPageType
                .sort((a, b) => b.count - a.count)
                .map((row) => ({
                  label: PAGE_TYPE_LABELS[row.pageType],
                  value: row.count,
                  tone: PAGE_TYPE_TONES[row.pageType],
                }))}
              emptyText="No visits in the last 30 days"
            />
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              {[
                {
                  label: "Products",
                  value: catalog.products,
                  detail: `${catalog.inStock} in stock`,
                  icon: Package,
                  href: "/admin/products",
                },
                {
                  label: "Customers",
                  value: users.total,
                  detail: `+${users.newLast30Days} this month`,
                  icon: Users,
                  href: "/admin/users",
                },
                {
                  label: "Categories",
                  value: catalog.categories,
                  detail: "in the store menu",
                  icon: FolderTree,
                  href: "/admin/categories",
                },
                {
                  label: "Visits",
                  value: visits.last30Days,
                  detail: "last 30 days",
                  icon: Eye,
                  href: "/admin/trafficView/1",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group rounded-xl p-3 ring-1 ring-slate-100 transition-all hover:bg-slate-50 hover:ring-slate-200"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <item.icon className="size-3.5 text-slate-400 transition-colors group-hover:text-brand-600" />
                    {item.label}
                  </span>
                  <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatNumber(item.value)}</p>
                  <p className="text-[11px] text-slate-400">{item.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* orders and products */}
      <section className="grid items-start gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Recent orders"
            description="The latest purchases"
            action={
              <Link href="/admin/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                All orders
              </Link>
            }
          />
          <div className="px-3 pb-3">
            {recentOrders.length ? (
              <ul className="flex flex-col">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders?order=${order.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        #{order.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{order.shippingName}</span>
                        <span className="block text-xs text-slate-500">
                          {formatCents(order.totalCents)} · {timeAgo(order.createdAt)}
                        </span>
                      </span>
                      <Badge tone={ORDER_STATUS_META[order.status].tone} dot>
                        {ORDER_STATUS_META[order.status].label}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={ShoppingBag} title="No orders yet" className="py-10" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Most viewed products" description="All-time product page visits" />
          <div className="px-3 pb-3">
            {topProducts.length ? (
              <ol className="flex flex-col">
                {topProducts.map((product, index) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.id}`}
                      target="_blank"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <span className="w-4 text-center text-xs font-semibold text-slate-400">{index + 1}</span>
                      <ProductThumb src={productImageUrl(product.image)} alt={product.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{product.name}</span>
                        <span className="block text-xs text-slate-500">
                          {formatPrice(product.salePrice ?? product.price)}
                        </span>
                      </span>
                      <Badge tone="brand">
                        {formatNumber(product.visits)} view{product.visits === 1 ? "" : "s"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={Eye} title="No product views yet" className="py-10" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Catalog health" description="Things worth fixing for a better storefront" />
          <div className="px-6 pb-6">
            {healthIssues.length ? (
              <ul className="flex flex-col gap-2.5">
                {healthIssues.map((issue) => (
                  <li key={issue.label}>
                    <Link
                      href="/admin/products"
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:border-slate-200 hover:bg-slate-50"
                    >
                      <span
                        className={
                          issue.tone === "danger"
                            ? "flex size-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600"
                            : "flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
                        }
                      >
                        <AlertTriangle className="size-4" />
                      </span>
                      <span className="flex-1 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{issue.count}</span> {issue.label}
                      </span>
                      <ArrowRight className="size-4 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="Everything looks great" description="No catalog issues found." />
            )}
            <Link
              href="/admin/brands"
              className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Tags className="size-4 text-slate-400" /> {catalog.brands} brands · {catalog.onSale} products on sale
              </span>
              <ArrowRight className="size-4 text-slate-300" />
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default AdminDashboard;
