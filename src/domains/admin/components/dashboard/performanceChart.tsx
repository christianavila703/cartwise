"use client";

import { useState } from "react";

import { TDailyCount } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";

import { AreaChart } from "../ui/charts";

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

type TProps = {
  revenue: TDailyCount[];
  visits: TDailyCount[];
};

/** Daily revenue or visits for the last 30 days, switchable. */
export const PerformanceChart = ({ revenue, visits }: TProps) => {
  const [metric, setMetric] = useState<"revenue" | "visits">("revenue");

  return (
    <div>
      <div className="mb-3 flex justify-end px-2">
        <div className="flex gap-1 rounded-lg bg-slate-100/80 p-0.5">
          {(["revenue", "visits"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMetric(item)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                metric === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {metric === "revenue" ? (
        <AreaChart data={revenue} label="Revenue" formatValue={(cents) => euros.format(cents / 100)} />
      ) : (
        <AreaChart data={visits} label="Visits" />
      )}
    </div>
  );
};
