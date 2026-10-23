import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/utils/styling";

type TVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type TSize = "sm" | "md" | "icon";

const variants: Record<TVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none",
  secondary:
    "bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:text-slate-300",
  danger: "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 active:bg-red-800 disabled:bg-red-300",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:text-brand-300",
};

const sizes: Record<TSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  icon: "size-9 rounded-lg",
};

type TProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TVariant;
  size?: TSize;
  isLoading?: boolean;
};

export const AdminButton = forwardRef<HTMLButtonElement, TProps>(
  ({ variant = "secondary", size = "md", isLoading, className, children, disabled, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all duration-200 select-none cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
);
AdminButton.displayName = "AdminButton";
