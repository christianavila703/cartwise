import "server-only";

import { Prisma } from "@prisma/client";

/** Thrown when a product doesn't have enough stock left for an order. */
export class OutOfStockError extends Error {
  constructor(
    public productName: string,
    public available: number
  ) {
    super(available > 0 ? `Only ${available} left of ${productName}` : `${productName} is out of stock`);
  }
}

type TStockLine = { productId: string; quantity: number; name: string };

/**
 * Takes stock for an order. Each decrement only succeeds while enough is left, so two customers
 * can never buy the same last unit. Must run inside the transaction that creates the order.
 */
export const reserveStock = async (tx: Prisma.TransactionClient, lines: TStockLine[]) => {
  for (const line of lines) {
    const updated = await tx.$executeRaw`
      UPDATE "Product" SET "stock" = "stock" - ${line.quantity}
      WHERE "id" = ${line.productId} AND "stock" >= ${line.quantity}
    `;
    if (updated === 0) {
      const product = await tx.product.findUnique({ where: { id: line.productId }, select: { stock: true } });
      throw new OutOfStockError(line.name, product?.stock ?? 0);
    }
  }
};

/** Puts an order's items back into stock (cancelled checkouts, restocked refunds). */
export const releaseStock = async (
  tx: Prisma.TransactionClient,
  items: { productId: string | null; quantity: number }[]
) => {
  for (const item of items) {
    // products deleted since the order have nothing to restock
    if (!item.productId) continue;
    await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
};
