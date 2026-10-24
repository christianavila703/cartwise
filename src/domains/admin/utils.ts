import { IMAGE_BASE_URL } from "@/shared/constants/store";

const priceFormatter = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const numberFormatter = new Intl.NumberFormat("en-US");

export const formatPrice = (value: number) => priceFormatter.format(value);

export const formatNumber = (value: number) => numberFormatter.format(value);

export const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const timeAgo = (value: Date | string) => {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (seconds >= size) return formatter.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
};

/** Percentage change, or null when there is nothing to compare against. */
export const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100);

export const productImageUrl = (path: string | null | undefined) => (path ? IMAGE_BASE_URL + path : null);

export const discountPercent = (price: number, salePrice: number | null) =>
  salePrice ? Math.round((1 - salePrice / price) * 100) : 0;
