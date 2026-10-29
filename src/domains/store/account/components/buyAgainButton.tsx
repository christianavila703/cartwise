"use client";

import { RotateCcw } from "lucide-react";
import { useDispatch } from "react-redux";

import { cn } from "@/shared/utils/styling";
import { add } from "@/store/shoppingCart";

type TProps = {
  items: { productId: string | null; quantity: number }[];
  className?: string;
};

/** Puts an order's products back in the cart; the cart and checkout check prices and stock again. */
export const BuyAgainButton = ({ items, className }: TProps) => {
  const dispatch = useDispatch();
  // products deleted from the catalog since the order can't be bought again
  const available = items.filter((item): item is { productId: string; quantity: number } => !!item.productId);
  if (!available.length) return null;

  return (
    <button
      type="button"
      onClick={() => {
        available.forEach((item) => dispatch(add({ productId: item.productId, quantity: item.quantity })));
        document.documentElement.classList.add("noScroll");
      }}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50",
        className
      )}
    >
      <RotateCcw className="size-4" /> Buy again
    </button>
  );
};
