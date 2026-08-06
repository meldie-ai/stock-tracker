import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { adjustSchema } from "@/lib/validation";
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
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }
  const { mode, value, reason } = parsed.data;

  const activeShift = await prisma.shift.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
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

      const nextStock = mode === "set" ? value : product.stockCount + value;
      if (nextStock < 0) throw new Error("NEGATIVE");
      const quantityDelta = nextStock - product.stockCount;
      if (quantityDelta < 0 && !reason) throw new Error("REASON_REQUIRED");

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockCount: nextStock },
      });

      await recordAuditEntry(tx, {
        action: "ADJUST",
        userId: auth.user.userId,
        usernameSnapshot: auth.user.username,
        productId: product.id,
        productNameSnapshot: product.name,
        categoryNameSnapshot: product.category.name,
        quantityDelta: updated.stockCount - product.stockCount,
        stockBefore: product.stockCount,
        stockAfter: updated.stockCount,
        shiftId: activeShift.id,
        note: quantityDelta < 0 ? reason! : null,
      });

      let finalStockCount = updated.stockCount;
      const cascade = await tryCascadeSinglesFromCarton(tx, {
        productName: product.name,
        categoryName: product.category.name,
        linkedCartonProductId: product.linkedCartonProductId,
        newStockCount: updated.stockCount,
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

      return { stockCount: finalStockCount };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "NEGATIVE") {
      return NextResponse.json(
        { error: "Stock count cannot go below 0" },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "REASON_REQUIRED") {
      return NextResponse.json(
        { error: "Select a reason for the deduction" },
        { status: 400 }
      );
    }
    throw err;
  }
}
