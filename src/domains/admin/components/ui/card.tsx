import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/shared/utils/styling";

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div
    className={cn(
      "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
      className
    )}
  >
    {children}
  </div>
);

type TCardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export const CardHeader = ({ title, description, action, className }: TCardHeaderProps) => (
  <div className={cn("flex items-start justify-between gap-4 px-6 pt-5 pb-4", className)}>
    <div className="min-w-0">
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
    </div>
    {action}
  </div>
);

type TStatCardProps = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "brand" | "emerald" | "amber" | "violet" | "rose";
  footer?: ReactNode;
  trend?: number | null;
  className?: string;
};

const tones = {
  brand: "from-brand-500 to-brand-700 shadow-brand-600/30",
  emerald: "from-emerald-400 to-emerald-600 shadow-emerald-500/30",
  amber: "from-amber-400 to-orange-500 shadow-amber-500/30",
  violet: "from-violet-400 to-violet-600 shadow-violet-500/30",
  rose: "from-rose-400 to-rose-600 shadow-rose-500/30",
};

export const StatCard = ({ label, value, icon: Icon, tone = "brand", footer, trend, className }: TStatCardProps) => (
  <Card className={cn("relative overflow-hidden p-5", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-[28px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      </div>
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
          tones[tone]
        )}
      >
        <Icon className="size-5" strokeWidth={2} />
      </div>
    </div>
    {(footer || trend !== undefined) && (
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        {trend !== undefined && trend !== null && <TrendBadge value={trend} />}
        {footer}
      </div>
    )}
  </Card>
);

export const TrendBadge = ({ value }: { value: number }) => {
  const isUp = value >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      )}
    >
      <Icon className="size-3" />
      {isUp ? "+" : ""}
      {value}%
    </span>
  );
};
