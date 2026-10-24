import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/shared/lib/auth";

export const metadata: Metadata = {
  title: "Account — Cartwise",
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // signed-in users have no reason to see the sign in / sign up forms
  if (await getSession()) redirect("/");

  return children;
}
