import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { adjustSchema } from "@/lib/validation";
import { tryCascadeSinglesFromCarton } from "@/lib/cartonCascade";

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
  const { mode, value } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });
      if (!product) throw new Error("NOT_FOUND");

      const nextStock = mode === "set" ? value : product.stockCount + value;
      if (nextStock < 0) throw new Error("NEGATIVE");

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockCount: nextStock },
      });

      let finalStockCount = updated.stockCount;
      const cascade = await tryCascadeSinglesFromCarton(tx, {
        productName: product.name,
        categoryName: product.category.name,
        newStockCount: updated.stockCount,
      });
      if (cascade.cascaded) {
        const refilled = await tx.product.update({
          where: { id: productId },
          data: { stockCount: cascade.singlesStockCount },
        });
        finalStockCount = refilled.stockCount;
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
    throw err;
  }
}
