"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { clear } from "@/store/shoppingCart";

/** Empties the cart once an order is paid. Renders nothing. */
export const ClearCart = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(clear());
  }, [dispatch]);
  return null;
};
