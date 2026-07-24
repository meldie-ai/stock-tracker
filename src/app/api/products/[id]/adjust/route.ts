import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { adjustSchema } from "@/lib/validation";

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

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const nextStock = mode === "set" ? value : product.stockCount + value;
  if (nextStock < 0) {
    return NextResponse.json(
      { error: "Stock count cannot go below 0" },
      { status: 400 }
    );
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { stockCount: nextStock },
  });

  return NextResponse.json({ stockCount: updated.stockCount });
}
