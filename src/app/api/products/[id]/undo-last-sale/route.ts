import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { recordAuditEntry } from "@/lib/auditLog";
import { resolveUnitPriceCents } from "@/lib/pricing";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Reverses the most recent plain Cash/Card sale of a product, only while it's still the last
 * thing that happened to that product this shift. Deliberately narrow: products that auto-refill
 * from a linked carton are excluded entirely (undoing would also need to reverse whatever
 * cartons that sale consumed, which this doesn't attempt), and deal sales aren't undoable here
 * either (a deal sale can span several products atomically — out of scope). Anything outside
 * this narrow case should be fixed with Adjust stock instead.
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
  });
  if (!activeShift) {
    return NextResponse.json({ error: "Start a shift to do this" }, { status: 409 });
  }

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
      if (!lastEntry || lastEntry.action !== "SELL") throw new Error("NOTHING_TO_UNDO");

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
        action: "UNDO_SALE",
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
