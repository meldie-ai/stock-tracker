import { prisma } from "@/lib/prisma";

/**
 * Closes the given active shift: backfills a zero-sale row for any product that
 * wasn't sold this shift (so the historical "sold" list is complete), snapshots
 * every product's current stock count, and marks the shift CLOSED. Shared by the
 * manual "End shift" route and the scheduled auto-end-shift cron job, which only
 * differ in who (if anyone) gets credited and whether a note is left explaining why.
 */
export async function closeActiveShift(
  activeShiftId: string,
  endedByUserId: string | null,
  note?: { usernameSnapshot: string; text: string }
) {
  const endedAt = new Date();

  const [products, existingSales] = await Promise.all([
    prisma.product.findMany({ include: { category: true } }),
    prisma.shiftSale.findMany({
      where: { shiftId: activeShiftId },
      select: { productId: true },
    }),
  ]);
  const existingSaleProductIds = new Set(existingSales.map((s) => s.productId));
  const missingSaleProducts = products.filter((p) => !existingSaleProductIds.has(p.id));

  return prisma.$transaction(
    async (tx) => {
      if (missingSaleProducts.length > 0) {
        await tx.shiftSale.createMany({
          data: missingSaleProducts.map((product) => ({
            shiftId: activeShiftId,
            productId: product.id,
            productNameSnapshot: product.name,
            categoryNameSnapshot: product.category.name,
            categorySortOrder: product.category.sortOrder,
            sortOrder: product.sortOrder,
            soldCount: 0,
          })),
        });
      }

      await tx.shiftStockSnapshot.createMany({
        data: products.map((product) => ({
          shiftId: activeShiftId,
          productId: product.id,
          productNameSnapshot: product.name,
          categoryNameSnapshot: product.category.name,
          categorySortOrder: product.category.sortOrder,
          sortOrder: product.sortOrder,
          stockCountAtClose: product.stockCount,
        })),
      });

      if (note) {
        await tx.shiftNote.create({
          data: {
            shiftId: activeShiftId,
            userId: null,
            usernameSnapshot: note.usernameSnapshot,
            text: note.text,
          },
        });
      }

      return tx.shift.update({
        where: { id: activeShiftId },
        data: {
          status: "CLOSED",
          endedAt,
          endedByUserId,
        },
      });
    },
    { timeout: 15000 }
  );
}
