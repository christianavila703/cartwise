"use client";

import { PageType } from "@prisma/client";
import { Eraser, Eye, Globe2, Monitor, MousePointerClick, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { clearTraffic, deleteTraffic, getTrafficReport, getTrafficStats, TTrafficListItem } from "@/actions/pageVisit/pageVisitServices";
import { TRAFFIC_LIST_PAGE_SIZE } from "@/shared/constants/admin/trafficView";
import { TTrafficStats } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";

import { formatDateTime, formatNumber } from "../../utils";
import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { Card, CardHeader, StatCard } from "../ui/card";
import { AreaChart, BarList } from "../ui/charts";
import { EmptyState, PageHeader, Pagination, Skeleton } from "../ui/misc";
import { ConfirmDialog } from "../ui/overlay";
import { useToast } from "../ui/toast";

const PAGE_TYPES: { value: PageType | ""; label: string }[] = [
  { value: "", label: "All pages" },
  { value: "MAIN", label: "Homepage" },
  { value: "LIST", label: "Product lists" },
  { value: "PRODUCT", label: "Product pages" },
];
const PAGE_TYPE_BADGE = { MAIN: "brand", LIST: "violet", PRODUCT: "success" } as const;
const PAGE_TYPE_BAR = { MAIN: "bg-brand-500", LIST: "bg-violet-500", PRODUCT: "bg-emerald-500" } as const;
const pageTypeLabel = (type: PageType) => PAGE_TYPES.find((item) => item.value === type)?.label ?? type;

export const TrafficView = () => {
  const toast = useToast();
  const router = useRouter();
  const { pageNumber } = useParams<{ pageNumber: string }>();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const pageType = typeParam && typeParam in PageType ? (typeParam as PageType) : undefined;
  const page = Math.max(1, Number(pageNumber) || 1);

  const [stats, setStats] = useState<TTrafficStats | null>(null);
  const [list, setList] = useState<{ items: TTrafficListItem[]; total: number } | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingID, setDeletingID] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClear, setShowClear] = useState(false);

  const requestKey = `${page}-${pageType ?? ""}-${reloadKey}`;
  const isLoading = loadedKey !== requestKey;

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const [statsResponse, listResponse] = await Promise.all([
        getTrafficStats(),
        getTrafficReport((page - 1) * TRAFFIC_LIST_PAGE_SIZE, pageType),
      ]);
      if (ignore) return;
      if (statsResponse.res) setStats(statsResponse.res);
      if (listResponse.res) setList({ items: listResponse.res.list, total: listResponse.res.totalCount });
      else toast.error(listResponse.error ?? "Can't load traffic");
      setLoadedKey(requestKey);
    };
    load();
    return () => {
      ignore = true;
    };
  }, [page, pageType, requestKey, toast]);

  const reload = () => setReloadKey((key) => key + 1);
  const hrefFor = (targetPage: number, type: PageType | "" | undefined = pageType) =>
    `/admin/trafficView/${targetPage}${type ? `?type=${type}` : ""}`;

  const handleDelete = async (id: string) => {
    setDeletingID(id);
    const response = await deleteTraffic(id);
    setDeletingID(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    reload();
  };

  const handleClear = async () => {
    setIsClearing(true);
    const response = await clearTraffic();
    setIsClearing(false);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(`${formatNumber(response.res ?? 0)} visits cleared`);
    setShowClear(false);
    if (page !== 1) router.push(hrefFor(1));
    else reload();
  };

  const pageCount = list ? Math.max(1, Math.ceil(list.total / TRAFFIC_LIST_PAGE_SIZE)) : 1;
  const productVisits = stats?.byPageType.find((row) => row.pageType === "PRODUCT")?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Traffic"
        description="Page visits recorded by the storefront (production builds only)."
        actions={
          <AdminButton onClick={() => setShowClear(true)} disabled={!stats?.total}>
            <Eraser className="size-4" /> Clear all
          </AdminButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="All-time visits" value={stats ? formatNumber(stats.total) : "—"} icon={Globe2} tone="brand" />
        <StatCard
          label="Last 30 days"
          value={stats ? formatNumber(stats.last30Days) : "—"}
          icon={Eye}
          tone="violet"
        />
        <StatCard
          label="Product views · 30 days"
          value={stats ? formatNumber(productVisits) : "—"}
          icon={MousePointerClick}
          tone="emerald"
        />
      </div>

      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Daily visits" description="Last 30 days" />
          <div className="px-4 pb-4">
            {stats ? (
              stats.last30Days ? (
                <AreaChart data={stats.daily} />
              ) : (
                <EmptyState icon={Eye} title="No visits in the last 30 days" />
              )
            ) : (
              <Skeleton className="h-56" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top pages" description="Most visited paths, last 30 days" />
          <div className="flex flex-col gap-6 px-6 pb-6">
            {stats ? (
              <>
                <BarList
                  items={[...stats.byPageType].sort((a, b) => b.count - a.count).map((row) => ({
                    label: pageTypeLabel(row.pageType),
                    value: row.count,
                    tone: PAGE_TYPE_BAR[row.pageType],
                  }))}
                />
                <div className="border-t border-slate-100 pt-5">
                  <BarList
                    items={stats.topPaths.map((row) => ({ label: "/" + row.path.replace(/^\//, ""), value: row.count }))}
                  />
                </div>
              </>
            ) : (
              <Skeleton className="h-48" />
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h3 className="text-[15px] font-semibold text-slate-900">Visit log</h3>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1">
            {PAGE_TYPES.map((type) => (
              <Link
                key={type.value}
                href={hrefFor(1, type.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  (pageType ?? "") === type.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {type.label}
              </Link>
            ))}
          </div>
        </div>

        {isLoading && !list ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-11" />
            ))}
          </div>
        ) : !list || list.items.length === 0 ? (
          <EmptyState icon={Eye} title="No visits recorded" />
        ) : (
          <div className={cn("overflow-x-auto transition-opacity", isLoading && "opacity-50")}>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Page</th>
                  <th className="px-3 py-3 font-medium">Path</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Screen</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                      {item.time ? formatDateTime(item.time) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PAGE_TYPE_BADGE[item.pageType]} dot>
                        {pageTypeLabel(item.pageType)}
                      </Badge>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 font-mono text-xs text-slate-600">
                      /{(item.pagePath ?? "").replace(/^\//, "")}
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-3 text-slate-700">
                      {item.product ? (
                        <>
                          {item.product.name}
                          <span className="text-slate-400"> · {item.product.category.name}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">
                      {item.deviceResolution ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Monitor className="size-3.5 text-slate-400" />
                          {item.deviceResolution}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <AdminButton
                        variant="ghost"
                        size="icon"
                        aria-label="Delete visit"
                        isLoading={deletingID === item.id}
                        className="hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => handleDelete(item.id)}
                      >
                        {deletingID !== item.id && <Trash2 className="size-4" />}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && list.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
            <span className="text-xs text-slate-500">
              {formatNumber((page - 1) * TRAFFIC_LIST_PAGE_SIZE + 1)}–
              {formatNumber(Math.min(page * TRAFFIC_LIST_PAGE_SIZE, list.total))} of {formatNumber(list.total)} visits
            </span>
            <Pagination page={page} pageCount={pageCount} getHref={(target) => hrefFor(target)} />
          </div>
        )}
      </Card>

      {showClear && (
        <ConfirmDialog
          title="Clear all traffic?"
          message={`All ${formatNumber(stats?.total ?? 0)} recorded visits will be permanently deleted.`}
          confirmText="Clear traffic"
          isLoading={isClearing}
          onConfirm={handleClear}
          onClose={() => setShowClear(false)}
        />
      )}
    </>
  );
};
