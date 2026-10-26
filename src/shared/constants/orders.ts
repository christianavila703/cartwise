import { OrderStatus } from "@prisma/client";

/** statuses that represent money actually received and kept */
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

/** statuses that can still be refunded through Stripe */
export const REFUNDABLE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; customerLabel: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" | "violet" }
> = {
  PENDING: { label: "Unpaid", customerLabel: "Payment not completed", tone: "neutral" },
  PAID: { label: "To ship", customerLabel: "Preparing your order", tone: "warning" },
  SHIPPED: { label: "Shipped", customerLabel: "On its way", tone: "brand" },
  DELIVERED: { label: "Delivered", customerLabel: "Delivered", tone: "success" },
  CANCELLED: { label: "Cancelled", customerLabel: "Cancelled", tone: "danger" },
  REFUNDED: { label: "Refunded", customerLabel: "Refunded", tone: "violet" },
};

export const SHIPPING_CARRIERS = ["DHL", "DPD", "GLS", "Hermes", "UPS", "FedEx", "Post"] as const;

/** tracking page for the carriers we know, so customers can follow their parcel */
export const trackingUrl = (carrier: string | null, trackingNumber: string | null) => {
  if (!carrier || !trackingNumber) return null;
  const number = encodeURIComponent(trackingNumber);
  const urls: Record<string, string> = {
    DHL: `https://www.dhl.com/global-en/home/tracking/tracking-parcel.html?tracking-id=${number}`,
    DPD: `https://tracking.dpd.de/status/en_US/parcel/${number}`,
    GLS: `https://gls-group.com/track/${number}`,
    Hermes: `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${number}`,
    UPS: `https://www.ups.com/track?tracknum=${number}`,
    FedEx: `https://www.fedex.com/fedextrack/?trknbr=${number}`,
  };
  return urls[carrier] ?? null;
};
