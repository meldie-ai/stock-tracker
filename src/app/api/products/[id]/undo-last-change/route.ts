import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest, shiftOwnershipError } from "@/lib/apiHelpers";
import { recordAuditEntry } from "@/lib/auditLog";
import { resolveUnitPriceCents } from "@/lib/pricing";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Reverses the single most recent thing that happened to a product this shift — a plain
 * Cash/Card sale, or a stock adjustment — but only while it's still the last thing that
 * happened (undoing an undo isn't supported). Deliberately excludes products that auto-refill
 * from a linked carton entirely, since both a sell and an adjustment on one of those can
 * trigger a cascade into the linked carton, and undoing would also need to reverse that
 * cascade, which this doesn't attempt. Deal sales aren't undoable here either — a deal sale
 * can span several products atomically and its revenue isn't a plain per-unit price, so it
 * can't be reconstructed from the current price the way a plain sale's can.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const { id: productId } = await params;

  const activeShift = await prisma.shift.findFirst({
    where: { status: "ACTIVE" },
    include: { startedByUser: { select: { username: true } } },
  });
  if (!activeShift) {
    return NextResponse.json({ error: "Start a shift to do this" }, { status: 409 });
  }
  const ownershipError = shiftOwnershipError(activeShift, auth.user);
  if (ownershipError) return ownershipError;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });
      if (!product) throw new Error("NOT_FOUND");
      if (product.linkedCartonProductId) throw new Error("NOTHING_TO_UNDO");

      const lastEntry = await tx.auditLog.findFirst({
        where: { shiftId: activeShift.id, productId },
        orderBy: { createdAt: "desc" },
      });
      if (!lastEntry) throw new Error("NOTHING_TO_UNDO");

      if (lastEntry.action === "SELL") {
        const paymentMethod: PaymentMethod | null =
          lastEntry.note === "Cash sale" ? "CASH" : lastEntry.note === "Card sale" ? "CARD" : null;
        if (!paymentMethod) throw new Error("NOTHING_TO_UNDO");

        const quantity = -lastEntry.quantityDelta;
        const stockBefore = product.stockCount;

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stockCount: { increment: quantity } },
        });

        const unitPriceCents = resolveUnitPriceCents(product, product.category, paymentMethod);
        const revenueCents = (unitPriceCents ?? 0) * quantity;

        const shiftSale = await tx.shiftSale.findUnique({
          where: {
            shiftId_productId_paymentMethod: { shiftId: activeShift.id, productId, paymentMethod },
          },
        });
        if (!shiftSale) throw new Error("NOTHING_TO_UNDO");

        await tx.shiftSale.update({
          where: { id: shiftSale.id },
          data: {
            soldCount: Math.max(0, shiftSale.soldCount - quantity),
            revenueCentsCollected: Math.max(0, shiftSale.revenueCentsCollected - revenueCents),
          },
        });

        await tx.auditLog.delete({ where: { id: lastEntry.id } });

        await recordAuditEntry(tx, {
          action: "UNDO",
          userId: auth.user.userId,
          usernameSnapshot: auth.user.username,
          productId: product.id,
          productNameSnapshot: product.name,
          categoryNameSnapshot: product.category.name,
          quantityDelta: quantity,
          stockBefore,
          stockAfter: updatedProduct.stockCount,
          shiftId: activeShift.id,
          note: `Undid ${paymentMethod === "CASH" ? "Cash" : "Card"} sale of ${quantity}`,
        });

        const totalSold = await tx.shiftSale.aggregate({
          where: { shiftId: activeShift.id, productId },
          _sum: { soldCount: true },
        });

        return { stockCount: updatedProduct.stockCount, soldCount: totalSold._sum.soldCount ?? 0 };
      }

      if (lastEntry.action === "ADJUST") {
        const stockBefore = product.stockCount;

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stockCount: lastEntry.stockBefore },
        });

        await tx.auditLog.delete({ where: { id: lastEntry.id } });

        await recordAuditEntry(tx, {
          action: "UNDO",
          userId: auth.user.userId,
          usernameSnapshot: auth.user.username,
          productId: product.id,
          productNameSnapshot: product.name,
          categoryNameSnapshot: product.category.name,
          quantityDelta: updatedProduct.stockCount - stockBefore,
          stockBefore,
          stockAfter: updatedProduct.stockCount,
          shiftId: activeShift.id,
          note: `Undid adjustment (was: ${lastEntry.note ?? "no reason given"})`,
        });

        return { stockCount: updatedProduct.stockCount, soldCount: null };
      }

      throw new Error("NOTHING_TO_UNDO");
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "NOTHING_TO_UNDO") {
      return NextResponse.json(
        { error: "Nothing to undo — use Adjust stock instead" },
        { status: 409 }
      );
    }
    throw err;
  }
}
