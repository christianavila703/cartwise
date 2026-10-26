"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRef } from "react";

import { ProfileIcon } from "@/shared/components/icons/svgIcons";
import Button from "@/shared/components/UI/button";
import { useToggleMenu } from "@/shared/hooks/useToggleMenu";
import { cn } from "@/shared/utils/styling";

const menuItemClass =
  "flex w-full cursor-pointer items-center justify-center rounded-lg border border-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100";

const NavBarProfile = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useToggleMenu(false, menuRef);
  const { data: session, status } = useSession();
  const user = session?.user;

  const toggleMenu = () => {
    setIsActive((prev) => !prev);
  };

  return (
    <div className="relative">
      <Button
        onClick={toggleMenu}
        className={cn(
          "border-white h-9 hover:border-gray-300 transition-all text-gray-500 text-sm duration-300",
          isActive && "border-gray-300 bg-gray-50"
        )}
      >
        <ProfileIcon width={16} className="fill-white transition-all duration-300 stroke-gray-500 stroke-2" />
        <span className="select-none hidden lg:block max-w-[120px] truncate">
          {user ? user.name || user.email : "Account"}
        </span>
      </Button>
      <div
        ref={menuRef}
        className={cn(
          "absolute rounded-lg overflow-hidden flex flex-col items-center top-[42px] right-0 border border-gray-300 bg-white shadow-md scale-[0.97] invisible opacity-0 transition-all duration-300 p-1 z-10",
          user ? "w-[220px]" : "w-[140px]",
          isActive && "scale-100 visible opacity-100"
        )}
      >
        {status === "loading" ? (
          <div className="w-full h-9 rounded-lg bg-gray-100 animate-pulse" />
        ) : user ? (
          <>
            <div className="w-full px-4 py-2 mb-1 border-b border-gray-200 text-center">
              {user.name && <span className="block text-sm font-semibold text-gray-800 truncate">{user.name}</span>}
              <span className="block text-xs text-gray-500 truncate">{user.email}</span>
            </div>
            {user.role === "ADMIN" && (
              <Link href="/admin" className={menuItemClass}>
                Admin Dashboard
              </Link>
            )}
            <Link href="/account/orders" className={menuItemClass}>
              My Orders
            </Link>
            <Link href="/favorites" className={menuItemClass}>
              Favorites
            </Link>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={menuItemClass}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={menuItemClass}>
              Sign In
            </Link>
            <Link href="/signup" className={menuItemClass}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default NavBarProfile;
