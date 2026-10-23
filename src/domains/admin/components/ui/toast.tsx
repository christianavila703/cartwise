"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "@/shared/utils/styling";

type TToastTone = "success" | "error" | "info";
type TToast = { id: number; tone: TToastTone; message: string };
type TToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<TToastApi | null>(null);

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const iconColors = { success: "text-emerald-500", error: "text-rose-500", info: "text-brand-500" };

let nextID = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<TToast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: TToastTone, message: string) => {
      const id = ++nextID;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss]
  );

  const api = useMemo<TToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex animate-admin-toast items-start gap-3 rounded-xl bg-white p-4 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", iconColors[toast.tone])} />
              <p className="flex-1 text-sm text-slate-700">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
