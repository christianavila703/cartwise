"use client";

import { useDispatch } from "react-redux";

import { ShoppingIconFill } from "@/shared/components/icons/svgIcons";
import { TCartItem } from "@/shared/types/shoppingCart";
import { add } from "@/store/shoppingCart";

type TProps = {
  disabled: boolean;
  /** shown instead of "Add to Cart" while disabled */
  disabledLabel?: string;
  cartItemData: TCartItem;
};

const AddToCartButton = ({ cartItemData, disabled, disabledLabel = "Not available" }: TProps) => {
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    dispatch(add({ ...cartItemData }));
    document.documentElement.classList.add("noScroll");
  };

  return (
    <button
      disabled={disabled}
      className={
        "flex justify-center items-center gap-5 cursor-pointer ml-6 sm:ml-10 text-sm sm:text-lg font-light px-8 sm:px-12 py-2.5 bg-cartwise-red-500 rounded-lg text-white transition-all duration-300 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 disabled:text-sm"
      }
      onClick={() => handleAddToCart()}
    >
      {disabled ? (
        disabledLabel
      ) : (
        <>
          <ShoppingIconFill width={16} className="fill-white" />
          Add to Cart
        </>
      )}
    </button>
  );
};

export default AddToCartButton;
