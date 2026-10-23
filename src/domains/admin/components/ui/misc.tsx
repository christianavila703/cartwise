import { ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "@/shared/utils/styling";

type TPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const PageHeader = ({ title, description, actions }: TPageHeaderProps) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

type TEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ icon: Icon, title, description, action, className }: TEmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
    <div className="relative mb-4">
      <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl" />
      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-white text-brand-600 ring-1 ring-brand-100">
        <Icon className="size-6" />
      </div>
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />
);

type TToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export const Toggle = ({ checked, onChange, disabled, label }: TToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-emerald-500" : "bg-slate-300"
    )}
  >
    <span
      className={cn(
        "inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
        checked ? "translate-x-[22px]" : "translate-x-0.5"
      )}
    />
  </button>
);

const avatarColors = [
  "from-brand-400 to-brand-700",
  "from-violet-400 to-violet-700",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
];

export const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" }) => {
  const initials =
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  const color = avatarColors[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white",
        color,
        size === "sm" ? "size-8 text-xs" : "size-10 text-sm"
      )}
    >
      {initials}
    </span>
  );
};

type TPaginationProps = {
  page: number;
  pageCount: number;
  getHref: (page: number) => string;
};

export const Pagination = ({ page, pageCount, getHref }: TPaginationProps) => {
  if (pageCount <= 1) return null;

  // first, last and the pages around the current one
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === pageCount || Math.abs(item - page) <= 1
  );

  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-colors";

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <Link
        href={getHref(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(linkClass, "text-slate-600 hover:bg-slate-100", page === 1 && "pointer-events-none opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </Link>
      {pages.map((item, index) => (
        <span key={item} className="flex items-center gap-1">
          {index > 0 && item - pages[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <Link
            href={getHref(item)}
            className={cn(
              linkClass,
              item === page ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {item}
          </Link>
        </span>
      ))}
      <Link
        href={getHref(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className={cn(
          linkClass,
          "text-slate-600 hover:bg-slate-100",
          page === pageCount && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
};
