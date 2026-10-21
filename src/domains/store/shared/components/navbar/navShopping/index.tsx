"use client";

import { useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";

import ShoppingCart from "@/domains/store/shoppingCard/components/shoppingCart";
import { ShoppingIconOutline } from "@/shared/components/icons/svgIcons";
import { cn } from "@/shared/utils/styling";
import { TCartState, RootState } from "@/store/shoppingCart";
import { toggleCart } from "@/store/shoppingCart";

const subscribeNoop = () => () => {};

const NavBarShopping = () => {
  const dispatch = useDispatch();
  const localCartData = useSelector((state: RootState) => state.cart);
  // the cart is restored from localStorage, so only show it after hydration to match the server render
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const cartData: TCartState | undefined = isClient ? localCartData : undefined;
  let cartItemQuantity = 0;

  if (cartData && cartData.items.length > 0) {
    cartData.items.map((item) => (cartItemQuantity += item.quantity));
  }

  const handleCartVisibility = (visibility: boolean) => {
    dispatch(toggleCart(visibility));
    if (visibility) {
      document.documentElement.classList.add("noScroll");
    } else {
      document.documentElement.classList.remove("noScroll");
    }
  };

  return (
    <div className="flex items-center relative ml-9 mr-4 hover:stroke-gray-700 stroke-gray-500 cursor-pointer">
      <div onClick={() => handleCartVisibility(true)} className="border-none relative">
        <ShoppingIconOutline width={24} className="fill-none stroke-inherit transition-all duration-300" />
        <span
          className={cn(
            "absolute -top-2 -right-4 text-sm size-6 leading-6  text-center rounded-full",
            cartItemQuantity ? "text-white bg-red-500" : "text-gray-500 bg-gray-300"
          )}
        >
          {cartItemQuantity}
        </span>
      </div>
      <ShoppingCart
        isVisible={cartData ? cartData.isVisible : false}
        quantity={cartItemQuantity}
        handleOnClose={() => handleCartVisibility(false)}
      />
    </div>
  );
};

export default NavBarShopping;
