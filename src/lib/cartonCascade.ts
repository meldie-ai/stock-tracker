import type { Prisma } from "@/generated/prisma/client";
import { recordAuditEntry } from "@/lib/auditLog";

export const PACK_SIZE = 10;

export type CascadeCheckInput = {
  productName: string;
  linkedCartonProductId: string | null;
  newStockCount: number;
  userId: string;
  usernameSnapshot: string;
  shiftId?: string | null;
};

export type CascadeCheckResult = {
  cascaded: boolean;
  singlesStockCount: number;
};

/**
 * Call unconditionally after any write to a product's stockCount. No-ops
 * unless the product has an explicit linkedCartonProductId set (chosen in
 * Manage) and just hit exactly 0.
 *
 * This used to match a Singles product to its carton by category/product
 * name — a deliberate simplicity tradeoff that turned out to be too
 * fragile in practice (silently broke on any spelling or whitespace drift
 * between the two lists, with no error). An explicit link removes that
 * failure mode entirely.
 */
export async function tryCascadeSinglesFromCarton(
  tx: Prisma.TransactionClient,
  input: CascadeCheckInput
): Promise<CascadeCheckResult> {
  if (!input.linkedCartonProductId || input.newStockCount !== 0) {
    return { cascaded: false, singlesStockCount: input.newStockCount };
  }

  const cartonProduct = await tx.product.findUnique({
    where: { id: input.linkedCartonProductId },
    include: { category: true },
  });

  if (!cartonProduct || cartonProduct.stockCount <= 0) {
    return { cascaded: false, singlesStockCount: 0 };
  }

  await tx.product.update({
    where: { id: cartonProduct.id },
    data: { stockCount: { decrement: 1 } },
  });

  await recordAuditEntry(tx, {
    action: "CASCADE",
    userId: input.userId,
    usernameSnapshot: input.usernameSnapshot,
    productId: cartonProduct.id,
    productNameSnapshot: cartonProduct.name,
    categoryNameSnapshot: cartonProduct.category.name,
    quantityDelta: -1,
    stockBefore: cartonProduct.stockCount,
    stockAfter: cartonProduct.stockCount - 1,
    shiftId: input.shiftId,
    note: `Auto-decremented: 1 carton consumed to refill linked product "${input.productName}"`,
  });

  return { cascaded: true, singlesStockCount: PACK_SIZE };
}
