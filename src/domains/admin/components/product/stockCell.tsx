"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { setProductStock } from "@/actions/product/product";
import { LOW_STOCK_THRESHOLD } from "@/shared/constants/checkout";
import { cn } from "@/shared/utils/styling";

import { useToast } from "../ui/toast";

type TProps = {
  productID: string;
  productName: string;
  stock: number;
  onSaved: (stock: number) => void;
};

/** Inline stock editor for the product table: type a number, then Enter or click away to save. */
export const StockCell = ({ productID, productName, stock, onSaved }: TProps) => {
  const toast = useToast();
  const [value, setValue] = useState(String(stock));
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    const next = Number(value);
    if (value === "" || !Number.isInteger(next) || next === stock) {
      setValue(String(stock));
      return;
    }
    setIsSaving(true);
    const response = await setProductStock(productID, next);
    setIsSaving(false);
    if (response.error || !response.res) {
      toast.error(response.error ?? "Can't update the stock");
      setValue(String(stock));
      return;
    }
    onSaved(response.res.stock);
    toast.success(`${productName}: ${response.res.stock} in stock`);
  };

  const shown = Number(value || 0);
  const tone = shown <= 0 ? "bg-rose-500" : shown <= LOW_STOCK_THRESHOLD ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", tone)} />
      <div className="relative">
        <input
          inputMode="numeric"
          aria-label={`Stock of ${productName}`}
          value={value}
          disabled={isSaving}
          onChange={(e) => setValue(e.currentTarget.value.replace(/[^\d]/g, "").slice(0, 6))}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setValue(String(stock));
              e.currentTarget.blur();
            }
          }}
          className="h-8 w-20 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-slate-800 tabular-nums transition-all hover:border-slate-200 hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:outline-none"
        />
        {isSaving && <Loader2 className="absolute top-1/2 right-2 size-3.5 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      {shown > 0 && shown <= LOW_STOCK_THRESHOLD && <span className="text-xs font-medium text-amber-700">Low</span>}
    </div>
  );
};
