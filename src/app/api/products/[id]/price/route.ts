import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { priceSchema } from "@/lib/validation";
import { recordAuditEntry } from "@/lib/auditLog";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const { id: productId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = priceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid price or deal note" }, { status: 400 });
  }
  const { priceCents, dealNote } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!product) return null;

    const updated = await tx.product.update({
      where: { id: productId },
      data: {
        ...(priceCents !== undefined && { priceCents }),
        ...(dealNote !== undefined && { dealNote: dealNote || null }),
      },
    });

    if (priceCents !== undefined && priceCents !== product.priceCents) {
      await recordAuditEntry(tx, {
        action: "PRICE_CHANGE",
        userId: auth.user.userId,
        usernameSnapshot: auth.user.username,
        productId: product.id,
        productNameSnapshot: product.name,
        categoryNameSnapshot: product.category.name,
        quantityDelta: 0,
        stockBefore: product.stockCount,
        stockAfter: product.stockCount,
        note: `price ${product.priceCents ?? "unset"} -> ${priceCents ?? "unset"} (cents)`,
      });
    }

    return updated;
  });

  if (!result) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ priceCents: result.priceCents, dealNote: result.dealNote });
}
