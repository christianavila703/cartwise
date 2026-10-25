// shared by the checkout page and the server, so the totals shown always match what is charged

export const CURRENCY = "eur";

export const FREE_SHIPPING_THRESHOLD_CENTS = 100_00;
export const SHIPPING_CENTS = 9_99;

export const MAX_QUANTITY_PER_ITEM = 10;

export const SHIPPING_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LU", name: "Luxembourg" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
] as const;

export type TCountryCode = (typeof SHIPPING_COUNTRIES)[number]["code"];

export const shippingForSubtotal = (subtotalCents: number) =>
  subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CENTS;

export const toCents = (euros: number) => Math.round(euros * 100);

export const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: CURRENCY }).format(cents / 100);

export const countryName = (code: string) => SHIPPING_COUNTRIES.find((country) => country.code === code)?.name ?? code;
