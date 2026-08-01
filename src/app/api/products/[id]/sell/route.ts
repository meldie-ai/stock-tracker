import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { sellSchema } from "@/lib/validation";
import { tryCascadeSinglesFromCarton } from "@/lib/cartonCascade";
import { recordAuditEntry } from "@/lib/auditLog";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const { id: productId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = sellSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quantity or payment method" }, { status: 400 });
  }
  const { quantity, paymentMethod } = parsed.data;

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
      if (product.stockCount < quantity) throw new Error("INSUFFICIENT_STOCK");

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockCount: { decrement: quantity } },
      });

      await recordAuditEntry(tx, {
        action: "SELL",
        userId: auth.user.userId,
        usernameSnapshot: auth.user.username,
        productId: product.id,
        productNameSnapshot: product.name,
        categoryNameSnapshot: product.category.name,
        quantityDelta: -quantity,
        stockBefore: product.stockCount,
        stockAfter: updatedProduct.stockCount,
        shiftId: activeShift.id,
      });

      let finalStockCount = updatedProduct.stockCount;
      const cascade = await tryCascadeSinglesFromCarton(tx, {
        productName: product.name,
        linkedCartonProductId: product.linkedCartonProductId,
        newStockCount: updatedProduct.stockCount,
        userId: auth.user.userId,
        usernameSnapshot: auth.user.username,
        shiftId: activeShift.id,
      });
      if (cascade.cascaded) {
        const refilled = await tx.product.update({
          where: { id: productId },
          data: { stockCount: cascade.singlesStockCount },
        });
        finalStockCount = refilled.stockCount;

        await recordAuditEntry(tx, {
          action: "CASCADE",
          userId: auth.user.userId,
          usernameSnapshot: auth.user.username,
          productId: product.id,
          productNameSnapshot: product.name,
          categoryNameSnapshot: product.category.name,
          quantityDelta: refilled.stockCount,
          stockBefore: 0,
          stockAfter: refilled.stockCount,
          shiftId: activeShift.id,
          note: "Auto-refilled from linked carton product",
        });
      }

      await tx.shiftSale.upsert({
        where: {
          shiftId_productId_paymentMethod: { shiftId: activeShift.id, productId, paymentMethod },
        },
        create: {
          shiftId: activeShift.id,
          productId,
          productNameSnapshot: product.name,
          categoryNameSnapshot: product.category.name,
          categorySortOrder: product.category.sortOrder,
          sortOrder: product.sortOrder,
          soldCount: quantity,
          paymentMethod,
        },
        update: { soldCount: { increment: quantity } },
      });

      // A product can now have a separate row per payment method, so the "sold this shift"
      // figure shown in the UI is the combined total across both, not just this one row.
      const totalSold = await tx.shiftSale.aggregate({
        where: { shiftId: activeShift.id, productId },
        _sum: { soldCount: true },
      });

      return { stockCount: finalStockCount, soldCount: totalSold._sum.soldCount ?? 0 };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Not enough stock" }, { status: 400 });
    }
    throw err;
  }
}
