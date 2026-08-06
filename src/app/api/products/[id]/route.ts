import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { updateProductSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let data = parsed.data;

  // A "refills from" carton link only ever makes sense on a Singles product. If this move
  // takes it out of Singles, drop any existing link rather than leaving it dangling — an
  // orphaned link would otherwise sit invisible (Manage only shows the picker for Singles
  // products) until this product later hits 0 stock and auto-refills itself unexpectedly.
  if (data.categoryId) {
    const targetCategory = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { name: true },
    });
    if (targetCategory && targetCategory.name.trim().toUpperCase() !== "SINGLES") {
      data = { ...data, linkedCartonProductId: null };
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  return NextResponse.json(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
