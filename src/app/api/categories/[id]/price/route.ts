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

  const { id: categoryId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = priceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid price or deal note" }, { status: 400 });
  }
  const { priceCents, dealNote } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id: categoryId } });
    if (!category) return null;

    const updated = await tx.category.update({
      where: { id: categoryId },
      data: {
        ...(priceCents !== undefined && { priceCents }),
        ...(dealNote !== undefined && { dealNote: dealNote || null }),
      },
    });

    if (priceCents !== undefined && priceCents !== category.priceCents) {
      await recordAuditEntry(tx, {
        action: "PRICE_CHANGE",
        userId: auth.user.userId,
        usernameSnapshot: auth.user.username,
        productId: null,
        productNameSnapshot: "(all products)",
        categoryNameSnapshot: category.name,
        quantityDelta: 0,
        stockBefore: 0,
        stockAfter: 0,
        note: `category price ${category.priceCents ?? "unset"} -> ${priceCents ?? "unset"} (cents)`,
      });
    }

    return updated;
  });

  if (!result) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ priceCents: result.priceCents, dealNote: result.dealNote });
}
