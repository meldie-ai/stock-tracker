import type { Prisma } from "@/generated/prisma/client";

export const PACK_SIZE = 10;

const SINGLES_CATEGORY_NAME = "SINGLES";
const CARTONS_CATEGORY_NAME = "CARTONS";

export type CascadeCheckInput = {
  productName: string;
  categoryName: string;
  newStockCount: number;
};

export type CascadeCheckResult = {
  cascaded: boolean;
  singlesStockCount: number;
};

/**
 * Call unconditionally after any write to a product's stockCount. No-ops
 * unless the product is in a "SINGLES" category and just hit exactly 0.
 *
 * Matching a Singles product to its carton is by product name only (no
 * relation field) — a deliberate simplicity tradeoff. Renaming the
 * "SINGLES"/"CARTONS" categories, or letting a product's name drift between
 * the two lists, silently breaks the pairing (no error, just no auto-refill).
 */
export async function tryCascadeSinglesFromCarton(
  tx: Prisma.TransactionClient,
  input: CascadeCheckInput
): Promise<CascadeCheckResult> {
  const isSingles =
    input.categoryName.trim().toUpperCase() === SINGLES_CATEGORY_NAME;
  if (!isSingles || input.newStockCount !== 0) {
    return { cascaded: false, singlesStockCount: input.newStockCount };
  }

  const cartonProduct = await tx.product.findFirst({
    where: {
      name: { equals: input.productName, mode: "insensitive" },
      category: { name: { equals: CARTONS_CATEGORY_NAME, mode: "insensitive" } },
    },
  });

  if (!cartonProduct || cartonProduct.stockCount <= 0) {
    return { cascaded: false, singlesStockCount: 0 };
  }

  await tx.product.update({
    where: { id: cartonProduct.id },
    data: { stockCount: { decrement: 1 } },
  });

  return { cascaded: true, singlesStockCount: PACK_SIZE };
}
