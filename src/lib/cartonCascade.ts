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

  // Compare with both sides trimmed — a bare `equals` (even case-insensitive)
  // still fails on a stray trailing space or newline in either the category
  // or product name, e.g. picked up from the multi-line category rename
  // field. `contains` here is just a cheap DB-side pre-filter; the real
  // match happens below with both names normalized in application code.
  const normalizedProductName = input.productName.trim().toUpperCase();
  const cartonCategoryCandidates = await tx.product.findMany({
    where: {
      category: { name: { contains: CARTONS_CATEGORY_NAME, mode: "insensitive" } },
    },
    include: { category: true },
  });
  const cartonProduct = cartonCategoryCandidates.find(
    (p) =>
      p.category.name.trim().toUpperCase() === CARTONS_CATEGORY_NAME &&
      p.name.trim().toUpperCase() === normalizedProductName
  );

  if (!cartonProduct || cartonProduct.stockCount <= 0) {
    return { cascaded: false, singlesStockCount: 0 };
  }

  await tx.product.update({
    where: { id: cartonProduct.id },
    data: { stockCount: { decrement: 1 } },
  });

  return { cascaded: true, singlesStockCount: PACK_SIZE };
}
