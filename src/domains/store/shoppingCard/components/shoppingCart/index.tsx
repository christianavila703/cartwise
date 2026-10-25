"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { getCartProducts } from "@/actions/product/product";
import { CloseIcon, ShoppingIconEmpty } from "@/shared/components/icons/svgIcons";
import Button from "@/shared/components/UI/button";
import { FREE_SHIPPING_THRESHOLD_CENTS, formatCents, toCents } from "@/shared/constants/checkout";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { TCartListItemDB } from "@/shared/types/product";
import { TCartItemData } from "@/shared/types/shoppingCart";
import { cn } from "@/shared/utils/styling";
import { RootState } from "@/store/shoppingCart";

import CartItem from "./_components/cartItem";

type TProps = {
  isVisible: boolean;
  quantity?: number;
  handleOnClose: () => void;
};

const ShoppingCart = ({ isVisible, quantity, handleOnClose }: TProps) => {
  const [cartItems, setCartItems] = useState<TCartItemData[]>();
  const localCartItems = useSelector((state: RootState) => state.cart);

  useEffect(() => {
    const convertDBtoCartItems = (rawData: TCartListItemDB[]) => {
      const cartListItem: TCartItemData[] = [];
      rawData.forEach((item) => {
        cartListItem.push({
          productId: item.id,
          imgUrl: IMAGE_BASE_URL + item.images[0],
          price: item.price,
          quantity: localCartItems.items.find((f) => f.productId === item.id)?.quantity || 0,
          productName: item.name,
          dealPrice: item.salePrice || undefined,
        });
      });
      if (cartListItem.length > 0) return cartListItem;
      return null;
    };
    const getProductsFromDB = async () => {
      const productsIDs = localCartItems.items.map((s) => s.productId);

      if (productsIDs?.length === 0) setCartItems([]);

      if (productsIDs) {
        const response = await getCartProducts(productsIDs);
        if (response.res) {
          const finalResult = convertDBtoCartItems(response.res);

          if (!finalResult) return;

          setCartItems(finalResult);
        }
      }
    };

    if (localCartItems) {
      getProductsFromDB();
    }
  }, [localCartItems]);

  const subtotalCents = (cartItems ?? []).reduce(
    (sum, item) => sum + toCents(item.dealPrice ?? item.price) * item.quantity,
    0
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-[50] transition-all duration-300 cursor-default",
        isVisible ? "visible opacity-100" : "invisible opacity-0"
      )}
    >
      <div className="absolute inset-0 sm:bg-black/60 bg-black/40 cursor-pointer" onClick={handleOnClose} />
      <div
        className={cn(
          "absolute top-0 bottom-0 right-0 sm:w-[400px] w-5/6 bg-white flex flex-col pb-[190px] transition-transform duration-500 easeOutCustom",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between py-3 border-b border-gray-300 mx-6">
          <h2 className="text-gray-800 text-xl font-light">Shopping Cart ({quantity})</h2>
          <Button onClick={handleOnClose} className="p-2 size-11 border-white hover:border-gray-300">
            <CloseIcon width={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cartItems && cartItems.length ? (
            cartItems.map((item) => <CartItem data={item} onLinkClicked={handleOnClose} key={item.productId} />)
          ) : (
            <div className="flex flex-col items-center">
              <div className="mt-20 mb-16 p-6 bg-gray-100 rounded-full">
                <ShoppingIconEmpty width={36} className="fill-gray-500" />
              </div>
              <span className="text-center text-gray-500">Shopping Cart is Empty.</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[190px] bg-white border-t border-gray-300 flex flex-col items-center justify-center gap-3 mx-6">
          {!!cartItems?.length && (
            <>
              <div className="w-4/5 flex flex-col gap-0.5 text-sm">
                <div className="flex justify-between text-gray-800">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCents(subtotalCents)}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
                    ? "You get free shipping"
                    : `Add ${formatCents(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents)} more for free shipping`}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={handleOnClose}
                className="w-4/5 h-10 flex items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Checkout
              </Link>
            </>
          )}
          <Button
            onClick={handleOnClose}
            className="text-gray-500 text-sm w-4/5 border-gray-300 bg-gray-100 hover:border-gray-400 hover:bg-gray-200 active:border-gray-500 active:bg-gray-300"
          >
            Back to Shop
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
