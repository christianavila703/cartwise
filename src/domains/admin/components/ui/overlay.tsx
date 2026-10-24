"use client";

import { AlertTriangle, X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";

import { cn } from "@/shared/utils/styling";

import { AdminButton } from "./button";

// closes on Escape and locks page scroll while an overlay is open
const useOverlay = (onClose: () => void) => {
  // keep the latest callback without re-running the effect for every inline onClose
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, []);
};

type TModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
};

const modalSizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export const Modal = ({ title, description, onClose, children, footer, size = "md" }: TModalProps) => {
  useOverlay(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-admin-fade bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full animate-admin-scale flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200",
          modalSizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <AdminButton variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </AdminButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

type TDrawerProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export const Drawer = ({ title, description, onClose, children, footer }: TDrawerProps) => {
  useOverlay(onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-admin-fade bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-3xl animate-admin-drawer flex-col bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <AdminButton variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </AdminButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
};

type TConfirmProps = {
  title: string;
  message: ReactNode;
  confirmText?: string;
  tone?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmDialog = ({
  title,
  message,
  confirmText = "Delete",
  tone = "danger",
  isLoading,
  onConfirm,
  onClose,
}: TConfirmProps) => {
  useOverlay(onClose);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 animate-admin-fade bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md animate-admin-scale rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full",
              tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AdminButton onClick={onClose} disabled={isLoading}>
            Cancel
          </AdminButton>
          <AdminButton variant={tone} onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </AdminButton>
        </div>
      </div>
    </div>
  );
};
