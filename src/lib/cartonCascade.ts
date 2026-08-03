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

export type EnsureStockInput = {
  productId: string;
  productName: string;
  linkedCartonProductId: string | null;
  currentStockCount: number;
  quantityNeeded: number;
  userId: string;
  usernameSnapshot: string;
  shiftId?: string | null;
};

export type EnsureStockResult =
  | { ok: true; stockBefore: number }
  | { ok: false };

/**
 * Call before selling a quantity that might exceed current stock. If there's already enough,
 * this is a no-op. If not, and the product has a linked carton with enough combined stock
 * (currentStockCount + cartons available * PACK_SIZE), opens exactly as many cartons as needed
 * — all at once, in a single audit entry — so the sale can go through in one step instead of
 * requiring the cashier to split it into a same-size sale first. All-or-nothing: if the combined
 * total still isn't enough, no cartons are opened and the caller should reject the sale.
 */
export async function ensureSinglesStockForSale(
  tx: Prisma.TransactionClient,
  input: EnsureStockInput
): Promise<EnsureStockResult> {
  if (input.currentStockCount >= input.quantityNeeded) {
    return { ok: true, stockBefore: input.currentStockCount };
  }
  if (!input.linkedCartonProductId) {
    return { ok: false };
  }

  const cartonProduct = await tx.product.findUnique({
    where: { id: input.linkedCartonProductId },
    include: { category: true },
  });
  if (!cartonProduct) {
    return { ok: false };
  }

  const shortfall = input.quantityNeeded - input.currentStockCount;
  const cartonsNeeded = Math.ceil(shortfall / PACK_SIZE);
  if (cartonProduct.stockCount < cartonsNeeded) {
    return { ok: false };
  }

  await tx.product.update({
    where: { id: cartonProduct.id },
    data: { stockCount: { decrement: cartonsNeeded } },
  });

  await recordAuditEntry(tx, {
    action: "CASCADE",
    userId: input.userId,
    usernameSnapshot: input.usernameSnapshot,
    productId: cartonProduct.id,
    productNameSnapshot: cartonProduct.name,
    categoryNameSnapshot: cartonProduct.category.name,
    quantityDelta: -cartonsNeeded,
    stockBefore: cartonProduct.stockCount,
    stockAfter: cartonProduct.stockCount - cartonsNeeded,
    shiftId: input.shiftId,
    note: `Auto-decremented: ${cartonsNeeded} carton${cartonsNeeded > 1 ? "s" : ""} opened to cover a sale of ${input.quantityNeeded} "${input.productName}"`,
  });

  const toppedUp = await tx.product.update({
    where: { id: input.productId },
    data: { stockCount: { increment: cartonsNeeded * PACK_SIZE } },
  });

  return { ok: true, stockBefore: toppedUp.stockCount };
}
