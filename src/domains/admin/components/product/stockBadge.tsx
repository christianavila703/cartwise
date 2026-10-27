import { LOW_STOCK_THRESHOLD } from "@/shared/constants/checkout";

import { Badge } from "../ui/badge";

/** Out of stock, low stock or in stock, with the unit count. */
export const StockBadge = ({ stock }: { stock: number }) => {
  if (stock <= 0) return <Badge tone="danger" dot>Out of stock</Badge>;
  if (stock <= LOW_STOCK_THRESHOLD) return <Badge tone="warning" dot>Low · {stock} left</Badge>;
  return <Badge tone="success" dot>In stock · {stock}</Badge>;
};
