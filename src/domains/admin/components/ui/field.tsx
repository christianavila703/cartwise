import { ChevronDown, Search } from "lucide-react";
import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/utils/styling";

const controlClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs transition-all duration-200 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

type TFieldProps = {
  label?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export const Field = ({ label, hint, error, required, className, children }: TFieldProps) => (
  <label className={cn("flex flex-col gap-1.5", className)}>
    {label && (
      <span className="text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
    )}
    {children}
    {error ? (
      <span className="text-xs text-red-600">{error}</span>
    ) : hint ? (
      <span className="text-xs text-slate-500">{hint}</span>
    ) : null}
  </label>
);

type TInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & { prefix?: ReactNode; suffix?: ReactNode };

export const AdminInput = forwardRef<HTMLInputElement, TInputProps>(({ className, prefix, suffix, ...props }, ref) => {
  if (!prefix && !suffix) return <input ref={ref} className={cn(controlClass, "h-10", className)} {...props} />;

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 flex items-center text-sm text-slate-400">{prefix}</span>
      )}
      <input
        ref={ref}
        className={cn(controlClass, "h-10", prefix && "pl-9", suffix && "pr-10", className)}
        {...props}
      />
      {suffix && <span className="absolute right-3 flex items-center text-sm text-slate-400">{suffix}</span>}
    </div>
  );
});
AdminInput.displayName = "AdminInput";

export const AdminTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(controlClass, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />
  )
);
AdminTextarea.displayName = "AdminTextarea";

export const AdminSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(controlClass, "h-10 cursor-pointer appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
);
AdminSelect.displayName = "AdminSelect";

type TSearchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onValueChange: (value: string) => void;
};

export const SearchInput = ({ className, onValueChange, ...props }: TSearchProps) => (
  <AdminInput
    type="search"
    prefix={<Search className="size-4" />}
    className={className}
    onChange={(e) => onValueChange(e.currentTarget.value)}
    {...props}
  />
);
