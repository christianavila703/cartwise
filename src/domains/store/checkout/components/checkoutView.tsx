"use client";

import { AlertCircle, ArrowLeft, CreditCard, Info, Loader2, Lock, ShoppingBag, Truck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, InputHTMLAttributes, ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";

import { cancelCheckout, createCheckout, getCheckoutPreview } from "@/actions/checkout/checkout";
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_COUNTRIES, formatCents } from "@/shared/constants/checkout";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { TCheckoutPreview, TShippingAddress } from "@/shared/types/checkout";
import { cn } from "@/shared/utils/styling";
import { RootState, remove } from "@/store/shoppingCart";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10";

const FormField = ({
  label,
  optional,
  className,
  children,
}: {
  label: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <label className={cn("flex flex-col gap-1.5", className)}>
    <span className="text-sm font-medium text-gray-700">
      {label} {optional && <span className="font-normal text-gray-400">(optional)</span>}
    </span>
    {children}
  </label>
);

const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => <input className={inputClass} {...props} />;

const subscribeNoop = () => () => {};

type TProps = {
  user: { name: string; email: string };
  isTestMode: boolean;
  isPaymentConfigured: boolean;
};

export const CheckoutView = ({ user, isTestMode, isPaymentConfigured }: TProps) => {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const canceledOrderID = searchParams.get("canceled");
  const cartItems = useSelector((state: RootState) => state.cart.items);
  // the cart lives in localStorage, so wait for the browser before deciding the cart is empty
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [preview, setPreview] = useState<TCheckoutPreview | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [address, setAddress] = useState<TShippingAddress>({
    name: user.name,
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const cartKey = JSON.stringify(cartItems);
  const isEmpty = cartItems.length === 0;
  const isLoading = !isEmpty && loadedFor !== cartKey;

  // price the cart on the server whenever it changes
  useEffect(() => {
    if (cartItems.length === 0) return;
    let ignore = false;
    const load = async () => {
      const response = await getCheckoutPreview(cartItems);
      if (ignore) return;
      if (response.res) {
        setPreview(response.res);
        // products deleted from the catalog can never be bought, so drop them from the cart
        response.res.missingProductIDs.forEach((id) => dispatch(remove(id)));
      } else {
        setError(response.error ?? "Can't load your cart");
      }
      setLoadedFor(JSON.stringify(cartItems));
    };
    load();
    return () => {
      ignore = true;
    };
  }, [cartItems, dispatch]);

  // the customer came back from Stripe without paying
  useEffect(() => {
    if (canceledOrderID) cancelCheckout(canceledOrderID);
  }, [canceledOrderID]);

  const update = (values: Partial<TShippingAddress>) => setAddress((current) => ({ ...current, ...values }));
  const unavailable = preview?.lines.filter((line) => !line.isAvailable) ?? [];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsPaying(true);
    const response = await createCheckout({ items: cartItems, address });
    if (response.res) {
      window.location.href = response.res.url;
      return;
    }
    setIsPaying(false);
    setError(response.error ?? "Can't start the payment");
  };

  if (!isClient) {
    return (
      <div className="storeContainer">
        <div className="mt-[160px] mb-24 grid w-full gap-8 lg:grid-cols-[1fr_420px]">
          <div className="h-[420px] animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-[420px] animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="storeContainer">
        <div className="mx-auto mt-[160px] mb-24 flex max-w-md flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-gray-100">
            <ShoppingBag className="size-8 text-gray-400" />
          </span>
          <h1 className="mt-6 text-2xl font-light text-gray-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-500">Add some products before checking out.</p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <ArrowLeft className="size-4" /> Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="storeContainer">
      <div className="mt-[160px] mb-24 w-full">
        <div className="mb-8 flex flex-col gap-1">
          <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="size-4" /> Continue shopping
          </Link>
          <h1 className="mt-3 text-3xl font-light text-gray-900">Checkout</h1>
        </div>

        {canceledOrderID && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <Info className="size-4 shrink-0" /> Payment was canceled. Your cart is still here whenever you&apos;re
            ready.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
          {/* shipping */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Truck className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Shipping details</h2>
                <p className="text-sm text-gray-500">The order confirmation goes to {user.email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" className="sm:col-span-2">
                <TextInput
                  required
                  autoComplete="name"
                  value={address.name}
                  onChange={(e) => update({ name: e.currentTarget.value })}
                />
              </FormField>
              <FormField label="Street address" className="sm:col-span-2">
                <TextInput
                  required
                  autoComplete="address-line1"
                  placeholder="Street and house number"
                  value={address.line1}
                  onChange={(e) => update({ line1: e.currentTarget.value })}
                />
              </FormField>
              <FormField label="Apartment, suite, etc." optional className="sm:col-span-2">
                <TextInput
                  autoComplete="address-line2"
                  value={address.line2}
                  onChange={(e) => update({ line2: e.currentTarget.value })}
                />
              </FormField>
              <FormField label="Postal code">
                <TextInput
                  required
                  autoComplete="postal-code"
                  value={address.postalCode}
                  onChange={(e) => update({ postalCode: e.currentTarget.value })}
                />
              </FormField>
              <FormField label="City">
                <TextInput
                  required
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(e) => update({ city: e.currentTarget.value })}
                />
              </FormField>
              <FormField label="Country">
                <select
                  required
                  autoComplete="country"
                  className={cn(inputClass, "cursor-pointer", !address.country && "text-gray-400")}
                  value={address.country}
                  onChange={(e) => update({ country: e.currentTarget.value })}
                >
                  <option value="" disabled>
                    Select a country
                  </option>
                  {SHIPPING_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code} className="text-gray-800">
                      {country.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Phone" optional>
                <TextInput
                  type="tel"
                  autoComplete="tel"
                  placeholder="For delivery questions"
                  value={address.phone}
                  onChange={(e) => update({ phone: e.currentTarget.value })}
                />
              </FormField>
            </div>
          </section>

          {/* summary */}
          <aside className="rounded-2xl border border-gray-200 bg-white p-6 lg:sticky lg:top-[150px]">
            <h2 className="text-lg font-medium text-gray-900">Order summary</h2>

            {isLoading && !preview ? (
              <div className="mt-6 flex flex-col gap-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : (
              <>
                <ul className={cn("mt-5 flex flex-col divide-y divide-gray-100", isLoading && "opacity-60")}>
                  {preview?.lines.map((line) => (
                    <li key={line.productId} className="flex items-center gap-4 py-3">
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {line.image && (
                          <Image
                            src={IMAGE_BASE_URL + line.image}
                            alt={line.name}
                            fill
                            sizes="64px"
                            className="object-contain p-1.5"
                          />
                        )}
                        <span className="absolute -top-0 -right-0 flex size-5 items-center justify-center rounded-bl-lg bg-gray-800 text-[11px] font-semibold text-white">
                          {line.quantity}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link
                          href={`/product/${line.productId}`}
                          className="line-clamp-2 text-sm text-gray-800 hover:text-brand-700"
                        >
                          {line.name}
                        </Link>
                        {line.isAvailable ? (
                          <span className="text-xs text-gray-500">
                            {line.quantity} × {formatCents(line.unitPriceCents)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-red-600">Out of stock</span>
                        )}
                      </span>
                      <span className="flex flex-col items-end">
                        <span
                          className={cn(
                            "text-sm font-semibold text-gray-900",
                            !line.isAvailable && "text-gray-400 line-through"
                          )}
                        >
                          {formatCents(line.unitPriceCents * line.quantity)}
                        </span>
                        {line.originalPriceCents && line.isAvailable && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatCents(line.originalPriceCents * line.quantity)}
                          </span>
                        )}
                        {!line.isAvailable && (
                          <button
                            type="button"
                            onClick={() => dispatch(remove(line.productId))}
                            className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                          >
                            <X className="size-3" /> Remove
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {preview && (
                  <dl className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <dt>Subtotal</dt>
                      <dd>{formatCents(preview.subtotalCents)}</dd>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <dt>Shipping</dt>
                      <dd>{preview.shippingCents ? formatCents(preview.shippingCents) : "Free"}</dd>
                    </div>
                    {preview.shippingCents > 0 && (
                      <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                        Add {formatCents(FREE_SHIPPING_THRESHOLD_CENTS - preview.subtotalCents)} more for free
                        shipping.
                      </p>
                    )}
                    <div className="mt-2 flex items-baseline justify-between border-t border-gray-100 pt-4">
                      <dt className="text-base font-medium text-gray-900">Total</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{formatCents(preview.totalCents)}</dd>
                    </div>
                  </dl>
                )}
              </>
            )}

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-200">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
            {unavailable.length > 0 && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Remove out-of-stock products to continue.
              </p>
            )}
            {!isPaymentConfigured && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Online payment isn&apos;t set up yet.
              </p>
            )}

            <button
              type="submit"
              disabled={isPaying || isLoading || !preview || unavailable.length > 0 || !isPaymentConfigured}
              className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              {isPaying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Redirecting to payment…
                </>
              ) : (
                <>
                  <Lock className="size-4" /> Pay {preview ? formatCents(preview.totalCents) : ""}
                </>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <CreditCard className="size-3.5" /> Secure payment by Stripe
            </p>
            {isTestMode && (
              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                Test mode — pay with card <span className="font-mono text-gray-700">4242 4242 4242 4242</span>, any
                future date and any CVC.
              </p>
            )}
          </aside>
        </form>
      </div>
    </div>
  );
};
