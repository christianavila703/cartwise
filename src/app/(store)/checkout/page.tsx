import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CheckoutView } from "@/domains/store/checkout/components/checkoutView";
import { getSession } from "@/shared/lib/auth";

export const metadata: Metadata = { title: "Checkout — Cartwise" };

const CheckoutPage = async () => {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/checkout");

  return (
    <Suspense>
      <CheckoutView
        user={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
        isTestMode={(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")}
        isPaymentConfigured={!!process.env.STRIPE_SECRET_KEY}
      />
    </Suspense>
  );
};

export default CheckoutPage;
