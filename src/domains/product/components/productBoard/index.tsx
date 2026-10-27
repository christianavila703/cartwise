"use client";

import Link from "next/link";
import { useState } from "react";
import { useSelector } from "react-redux";

import { FavoriteToggle } from "@/domains/store/favorites/components/FavoriteToggle";
import AddToCartButton from "@/domains/store/shoppingCard/components/addToCartButton";
import Quantity from "@/domains/store/shoppingCard/components/quantity";
import { StarIcon } from "@/shared/components/icons/svgIcons";
import { LOW_STOCK_THRESHOLD, maxOrderQuantity } from "@/shared/constants/checkout";
import { TProductBoard } from "@/shared/types/product";
import { TCartItem } from "@/shared/types/shoppingCart";
import { cn } from "@/shared/utils/styling";
import { RootState } from "@/store/shoppingCart";

const ProductBoard = ({ boardData }: { boardData: TProductBoard }) => {
  const { name, id, isAvailable, stock, specialFeatures, price, shortDesc, dealPrice, defaultQuantity } = boardData;
  const inCart = useSelector((state: RootState) => state.cart.items.find((item) => item.productId === id)?.quantity ?? 0);
  // what can still be added: the stock (capped per order) minus what's already in the cart
  const addable = Math.max(0, maxOrderQuantity(stock) - inCart);
  const [requested, setRequested] = useState(defaultQuantity > 1 ? defaultQuantity : 1);
  const quantity = Math.max(1, Math.min(requested, addable));

  const handleQuantityChange = (isReducing: boolean) => {
    setRequested(isReducing ? Math.max(1, quantity - 1) : Math.min(addable, quantity + 1));
  };

  const cartItemData: TCartItem = {
    productId: id,
    quantity: quantity,
  };
  return (
    <div className="w-full relative flex flex-col">
      <div className="absolute right-0 top-0 p-1">
        <FavoriteToggle productId={id} />
      </div>
      <section className="block w-full">
        <div className="flex items-center gap-0.5">
          <StarIcon width={15} stroke="#856B0F" fill="#FFD643" />
          <StarIcon width={15} stroke="#856B0F" fill="#FFD643" />
          <StarIcon width={15} stroke="#856B0F" fill="#FFD643" />
          <StarIcon width={15} stroke="#856B0F" fill="#FFD643" />
          <StarIcon width={15} stroke="#856B0F" fill="#FFD643" />
          <Link href={"#"} className="ml-4 text-xs text-cartwise-blue-300">
            880 User Reviews
          </Link>
        </div>
      </section>
      <h1 className="block text-2xl leading-9 font-medium my-2.5 mt-8 text-gray-700">{name}</h1>
      <span className="block text-xs text-gray-700 mb-4">{shortDesc}</span>
      <hr className="w-full border-t border-gray-300 mb-5" />
      <div className="flex flex-col gap-3 text-sm text-gray-500 mb-12">
        {specialFeatures && specialFeatures?.map((feature, index) => <span key={index}>{feature}</span>)}
      </div>
      <h2 className="text-3xl font-medium text-gray-800 mb-5">
        {(dealPrice ? dealPrice : price).toLocaleString("en-us", {
          minimumIntegerDigits: 2,
          minimumFractionDigits: 2,
        })}{" "}
        €
      </h2>

      {dealPrice && (
        <div className="mb-5 text-sm">
          <span className="text-white rounded-sm bg-cartwise-red-500 px-3 py-1">
            {`
            Save
            ${(price - dealPrice).toLocaleString("en-us", {
              minimumIntegerDigits: 2,
              minimumFractionDigits: 2,
            })} €
            `}
          </span>
          <span className="mt-[10px] block text-gray-800">Was {price} €</span>
        </div>
      )}
      <hr className="w-full border-t border-gray-300 mb-5" />

      <p
        className={cn(
          "mb-5 flex items-center gap-2 text-sm font-medium",
          !isAvailable ? "text-red-600" : stock <= LOW_STOCK_THRESHOLD ? "text-amber-700" : "text-emerald-700"
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            !isAvailable ? "bg-red-500" : stock <= LOW_STOCK_THRESHOLD ? "bg-amber-500" : "bg-emerald-500"
          )}
        />
        {!isAvailable ? "Out of stock" : stock <= LOW_STOCK_THRESHOLD ? `Only ${stock} left — order soon` : "In stock"}
        {isAvailable && inCart > 0 && <span className="font-normal text-gray-500">· {inCart} in your cart</span>}
      </p>

      {/* ----------------- ADD TO CART SECTION ----------------- */}
      <section className="flex items-center w-full">
        <Quantity onChange={handleQuantityChange} quantity={quantity} max={addable} />
        <AddToCartButton
          cartItemData={cartItemData}
          disabled={!isAvailable || addable === 0}
          disabledLabel={!isAvailable ? "Out of stock" : "All available units are in your cart"}
        />
      </section>
    </div>
  );
};

export default ProductBoard;
