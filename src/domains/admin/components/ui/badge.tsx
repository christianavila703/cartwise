import { ReactNode } from "react";

import { cn } from "@/shared/utils/styling";

type TTone = "neutral" | "brand" | "success" | "warning" | "danger" | "violet";

const tones: Record<TTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

const dots: Record<TTone, string> = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  violet: "bg-violet-500",
};

type TProps = {
  tone?: TTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
};

export const Badge = ({ tone = "neutral", dot, className, children }: TProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
      tones[tone],
      className
    )}
  >
    {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
    {children}
  </span>
);
