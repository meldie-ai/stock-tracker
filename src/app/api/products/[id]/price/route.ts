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
  const { cashPriceCents, cardPriceCents, dealNote, dealQuantity, dealPriceCents } = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const finalDealQuantity = dealQuantity !== undefined ? dealQuantity : existing.dealQuantity;
  const finalDealPriceCents = dealPriceCents !== undefined ? dealPriceCents : existing.dealPriceCents;
  if ((finalDealQuantity === null) !== (finalDealPriceCents === null)) {
    return NextResponse.json(
      { error: "Deal quantity and deal price must be set together" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!product) return null;

    const updated = await tx.product.update({
      where: { id: productId },
      data: {
        ...(cashPriceCents !== undefined && { cashPriceCents }),
        ...(cardPriceCents !== undefined && { cardPriceCents }),
        ...(dealNote !== undefined && { dealNote: dealNote || null }),
        ...(dealQuantity !== undefined && { dealQuantity }),
        ...(dealPriceCents !== undefined && { dealPriceCents }),
      },
    });

    const priceChanged =
      (cashPriceCents !== undefined && cashPriceCents !== product.cashPriceCents) ||
      (cardPriceCents !== undefined && cardPriceCents !== product.cardPriceCents);

    if (priceChanged) {
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
        note: `cash ${product.cashPriceCents ?? "unset"} -> ${cashPriceCents ?? "unset"}, card ${product.cardPriceCents ?? "unset"} -> ${cardPriceCents ?? "unset"} (cents)`,
      });
    }

    return updated;
  });

  if (!result) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    cashPriceCents: result.cashPriceCents,
    cardPriceCents: result.cardPriceCents,
    dealNote: result.dealNote,
    dealQuantity: result.dealQuantity,
    dealPriceCents: result.dealPriceCents,
  });
}
