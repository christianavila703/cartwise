"use client";

import { OrderStatus } from "@prisma/client";
import {
  Ban,
  Check,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  PackageCheck,
  RotateCcw,
  Truck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";

import {
  cancelUnpaidOrder,
  getAdminOrder,
  markOrderDelivered,
  markOrderShipped,
  refundOrder,
  updateOrderTracking,
} from "@/actions/admin/orders";
import { countryName, formatCents } from "@/shared/constants/checkout";
import { ORDER_STATUS_META, REFUNDABLE_STATUSES, SHIPPING_CARRIERS, trackingUrl } from "@/shared/constants/orders";
import { TAdminOrderDetail } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";

import { formatDateTime, productImageUrl } from "../../utils";
import { Badge } from "../ui/badge";
import { AdminButton } from "../ui/button";
import { AdminInput, AdminSelect, Field } from "../ui/field";
import { Skeleton } from "../ui/misc";
import { ConfirmDialog, Drawer } from "../ui/overlay";
import { useToast } from "../ui/toast";

const Section = ({ title, icon: Icon, children }: { title: string; icon: typeof Truck; children: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
      <Icon className="size-4 text-slate-400" /> {title}
    </h3>
    {children}
  </section>
);

const Timeline = ({ order }: { order: TAdminOrderDetail }) => {
  const isStopped = order.status === "CANCELLED" || order.status === "REFUNDED";
  const steps: { label: string; date: Date | null }[] = [
    { label: "Placed", date: order.createdAt },
    { label: "Paid", date: order.paidAt },
    { label: "Shipped", date: order.shippedAt },
    { label: "Delivered", date: order.deliveredAt },
  ];

  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const isDone = !!step.date;
        return (
          <li key={step.label} className="relative flex flex-col items-center text-center">
            {index > 0 && (
              <span
                className={cn(
                  "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                  isDone ? "bg-emerald-400" : "bg-slate-200"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white",
                isDone ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
              )}
            >
              {isDone ? <Check className="size-4" /> : index + 1}
            </span>
            <span className={cn("mt-2 text-xs font-medium", isDone ? "text-slate-800" : "text-slate-400")}>
              {step.label}
            </span>
            <span className="text-[11px] text-slate-400">{step.date ? formatDateTime(step.date) : "—"}</span>
          </li>
        );
      })}
      {isStopped && (
        <li className="col-span-4 mt-2 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs text-rose-700 ring-1 ring-rose-100">
          {order.status === "REFUNDED"
            ? `Refunded ${order.refundedAt ? formatDateTime(order.refundedAt) : ""}`
            : `Cancelled ${order.cancelledAt ? formatDateTime(order.cancelledAt) : ""}`}
        </li>
      )}
    </ol>
  );
};

type TProps = {
  orderID: string;
  onClose: () => void;
  onChanged: () => void;
};

export const OrderDrawer = ({ orderID, onClose, onChanged }: TProps) => {
  const toast = useToast();
  const [order, setOrder] = useState<TAdminOrderDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [carrier, setCarrier] = useState<string>(SHIPPING_CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"refund" | "cancel" | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const response = await getAdminOrder(orderID);
      if (ignore) return;
      if (!response.res) {
        toast.error(response.error ?? "Can't load the order");
        onClose();
        return;
      }
      setOrder(response.res);
      if (response.res.trackingCarrier) setCarrier(response.res.trackingCarrier);
      setTrackingNumber(response.res.trackingNumber ?? "");
    };
    load();
    return () => {
      ignore = true;
    };
    // reload when the order changes; onClose and toast are stable for the drawer's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderID, reloadKey]);

  const run = async (key: string, action: () => Promise<{ error?: string; res?: unknown }>, success: string) => {
    setBusy(key);
    const response = await action();
    setBusy(null);
    setConfirm(null);
    if (response.error) {
      toast.error(response.error);
      return;
    }
    toast.success(success);
    setReloadKey((value) => value + 1);
    onChanged();
  };

  const tracking = { carrier, number: trackingNumber };
  const status: OrderStatus | null = order?.status ?? null;
  const trackingLink = order ? trackingUrl(order.trackingCarrier, order.trackingNumber) : null;

  return (
    <Drawer
      title={order ? `Order #${order.number}` : "Order"}
      description={order ? `Placed ${formatDateTime(order.createdAt)} · ${order.email}` : "Loading…"}
      onClose={onClose}
    >
      {!order ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <Badge tone={ORDER_STATUS_META[order.status].tone} dot>
                {ORDER_STATUS_META[order.status].label}
              </Badge>
              <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatCents(order.totalCents)}</span>
            </div>
            <Timeline order={order} />
          </section>

          {/* next step */}
          {status === "PAID" && (
            <Section title="Ready to ship" icon={Truck}>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Field label="Carrier">
                  <AdminSelect value={carrier} onChange={(e) => setCarrier(e.currentTarget.value)}>
                    {SHIPPING_CARRIERS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field label="Tracking number" hint="Optional, shown to the customer">
                  <AdminInput value={trackingNumber} onChange={(e) => setTrackingNumber(e.currentTarget.value)} />
                </Field>
              </div>
              <AdminButton
                variant="primary"
                className="mt-4 w-full"
                isLoading={busy === "ship"}
                onClick={() => run("ship", () => markOrderShipped(order.id, tracking), `Order #${order.number} shipped`)}
              >
                <Truck className="size-4" /> Mark as shipped
              </AdminButton>
            </Section>
          )}

          {(status === "SHIPPED" || status === "DELIVERED") && (
            <Section title="Shipment" icon={PackageCheck}>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                <Field label="Carrier">
                  <AdminSelect value={carrier} onChange={(e) => setCarrier(e.currentTarget.value)}>
                    {SHIPPING_CARRIERS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </AdminSelect>
                </Field>
                <Field label="Tracking number">
                  <AdminInput value={trackingNumber} onChange={(e) => setTrackingNumber(e.currentTarget.value)} />
                </Field>
                <AdminButton
                  isLoading={busy === "tracking"}
                  onClick={() => run("tracking", () => updateOrderTracking(order.id, tracking), "Tracking saved")}
                >
                  Save
                </AdminButton>
              </div>
              {trackingLink && (
                <a
                  href={trackingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Track parcel <ExternalLink className="size-3.5" />
                </a>
              )}
              {status === "SHIPPED" && (
                <AdminButton
                  variant="primary"
                  className="mt-4 w-full"
                  isLoading={busy === "deliver"}
                  onClick={() =>
                    run("deliver", () => markOrderDelivered(order.id), `Order #${order.number} marked as delivered`)
                  }
                >
                  <PackageCheck className="size-4" /> Mark as delivered
                </AdminButton>
              )}
            </Section>
          )}

          {status === "PENDING" && (
            <Section title="Awaiting payment" icon={CreditCard}>
              <p className="text-sm text-slate-600">
                The customer started checkout but hasn&apos;t paid. Unpaid orders cancel themselves when the payment
                page expires after 30 minutes.
              </p>
              <AdminButton className="mt-4" onClick={() => setConfirm("cancel")}>
                <Ban className="size-4" /> Cancel order
              </AdminButton>
            </Section>
          )}

          {/* items */}
          <Section title={`Items (${order.items.reduce((sum, item) => sum + item.quantity, 0)})`} icon={PackageCheck}>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const src = productImageUrl(item.image);
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                      {src && <Image src={src} alt={item.name} fill sizes="48px" className="object-contain p-1" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{item.name}</span>
                      <span className="text-xs text-slate-500">
                        {item.quantity} × {formatCents(item.unitPriceCents)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                      {formatCents(item.unitPriceCents * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-2 flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-slate-500">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{order.shippingCents ? formatCents(order.shippingCents) : "Free"}</dd>
              </div>
              <div className="flex justify-between font-semibold text-slate-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCents(order.totalCents)}</dd>
              </div>
            </dl>
          </Section>

          <div className="grid gap-5 sm:grid-cols-2">
            <Section title="Customer" icon={UserRound}>
              <p className="text-sm font-medium text-slate-900">{order.customer.name || order.address.name}</p>
              <a
                href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Cartwise order #${order.number}`)}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
              >
                <Mail className="size-3.5" /> {order.email}
              </a>
              <p className="mt-2 text-xs text-slate-500">
                {order.customer.orderCount} order{order.customer.orderCount === 1 ? "" : "s"} in total
              </p>
            </Section>
            <Section title="Ship to" icon={MapPin}>
              <address className="text-sm leading-relaxed text-slate-600 not-italic">
                {order.address.name}
                <br />
                {order.address.line1}
                {order.address.line2 && (
                  <>
                    <br />
                    {order.address.line2}
                  </>
                )}
                <br />
                {order.address.postalCode} {order.address.city}
                <br />
                {countryName(order.address.country)}
                {order.address.phone && (
                  <>
                    <br />
                    {order.address.phone}
                  </>
                )}
              </address>
            </Section>
          </div>

          <Section title="Payment" icon={CreditCard}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {order.paidAt ? `Paid with Stripe on ${formatDateTime(order.paidAt)}` : "Not paid"}
              </p>
              <div className="flex gap-2">
                {order.stripeDashboardUrl && (
                  <a
                    href={order.stripeDashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View in Stripe <ExternalLink className="size-3.5" />
                  </a>
                )}
                {status && REFUNDABLE_STATUSES.includes(status) && (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setConfirm("refund")}
                  >
                    <RotateCcw className="size-3.5" /> Refund
                  </AdminButton>
                )}
              </div>
            </div>
          </Section>
        </div>
      )}

      {order && confirm === "refund" && (
        <ConfirmDialog
          title={`Refund order #${order.number}?`}
          message={`${formatCents(order.totalCents)} will be returned to the customer's card through Stripe. This can't be undone.`}
          confirmText="Refund"
          isLoading={busy === "refund"}
          onConfirm={() => run("refund", () => refundOrder(order.id), `Order #${order.number} refunded`)}
          onClose={() => setConfirm(null)}
        />
      )}
      {order && confirm === "cancel" && (
        <ConfirmDialog
          title={`Cancel order #${order.number}?`}
          message="The payment page will be closed so this order can no longer be paid."
          confirmText="Cancel order"
          isLoading={busy === "cancel"}
          onConfirm={() => run("cancel", () => cancelUnpaidOrder(order.id), `Order #${order.number} cancelled`)}
          onClose={() => setConfirm(null)}
        />
      )}
    </Drawer>
  );
};
