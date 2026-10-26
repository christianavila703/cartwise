import { OrderStatus } from "@prisma/client";
import { Check } from "lucide-react";

import { ORDER_STATUS_META } from "@/shared/constants/orders";
import { TOrderSummary } from "@/shared/types/checkout";
import { cn } from "@/shared/utils/styling";

const badgeTones: Record<(typeof ORDER_STATUS_META)[OrderStatus]["tone"], string> = {
  neutral: "bg-gray-100 text-gray-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      badgeTones[ORDER_STATUS_META[status].tone]
    )}
  >
    {ORDER_STATUS_META[status].customerLabel}
  </span>
);

const formatDay = (date: Date | null) =>
  date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

/** Order placed → shipped → delivered, for customers. */
export const OrderProgress = ({ order }: { order: TOrderSummary }) => {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") return null;

  const steps = [
    { label: "Order placed", date: order.paidAt ?? order.createdAt },
    { label: "Shipped", date: order.shippedAt },
    { label: "Delivered", date: order.deliveredAt },
  ];

  return (
    <ol className="grid grid-cols-3">
      {steps.map((step, index) => {
        const isDone = !!step.date;
        return (
          <li key={step.label} className="relative flex flex-col items-center text-center">
            {index > 0 && (
              <span
                className={cn(
                  "absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2",
                  isDone ? "bg-brand-500" : "bg-gray-200"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full ring-4 ring-white",
                isDone ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"
              )}
            >
              {isDone ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-gray-300" />}
            </span>
            <span className={cn("mt-2 text-xs font-medium", isDone ? "text-gray-800" : "text-gray-400")}>
              {step.label}
            </span>
            <span className="text-[11px] text-gray-400">{formatDay(step.date) ?? "—"}</span>
          </li>
        );
      })}
    </ol>
  );
};
