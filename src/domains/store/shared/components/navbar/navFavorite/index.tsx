"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useSelector } from "react-redux";

import { HeartIcon } from "@/shared/components/icons/svgIcons";
import { cn } from "@/shared/utils/styling";
import type { RootState } from "@/store/shoppingCart";

const subscribeNoop = () => () => {};

const NavBarFavorite = () => {
  const storedCount = useSelector((s: RootState) => s.favorites.ids.length);
  // favorites are restored from localStorage, so only show the count after hydration (like the cart badge)
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const count = isClient ? storedCount : 0;

  return (
    <Link
      href="/favorites"
      className="relative ml-5 flex cursor-pointer items-center stroke-gray-500 hover:stroke-gray-700 sm:ml-7 md:ml-4"
      aria-label={`Favorites${count > 0 ? `, ${count} items` : ""}`}
    >
      <HeartIcon width={22} className="fill-white stroke-inherit transition-all duration-300" />
      <span
        className={cn(
          // the heart is shorter than the cart icon, so the badge sits a little higher to line up with the cart badge
          "absolute -top-[11px] -right-4 size-6 rounded-full text-center text-sm leading-6",
          count ? "bg-red-500 text-white" : "bg-gray-300 text-gray-500"
        )}
      >
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
};

export default NavBarFavorite;
