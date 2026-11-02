"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";

import { restoreSavedSession, shoppingCartStore } from "@/store/shoppingCart";

/** Client-side state for the store (cart and favorites), so the store layout itself can stay a server component. */
export const StoreProviders = ({ children }: { children: React.ReactNode }) => {
  // the saved cart lives in localStorage, which only exists in the browser; reading it after hydration keeps the
  // first render identical to the server's HTML
  useEffect(() => {
    restoreSavedSession();
  }, []);

  return <Provider store={shoppingCartStore}>{children}</Provider>;
};
