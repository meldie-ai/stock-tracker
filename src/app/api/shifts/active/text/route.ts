import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { categoriesForActiveShift, getCategoriesWithProducts } from "@/lib/data";
import { buildShiftText, capitalizeName } from "@/lib/textTemplates";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "SOLD" && kind !== "STOCK") {
    return NextResponse.json({ error: "kind must be SOLD or STOCK" }, { status: 400 });
  }

  const activeShift = await prisma.shift.findFirst({
    where: { status: "ACTIVE" },
    include: { sales: true },
  });
  if (!activeShift) {
    return NextResponse.json({ error: "No active shift" }, { status: 404 });
  }

  const categoriesWithProducts = await getCategoriesWithProducts();
  const soldByProductId = new Map(activeShift.sales.map((s) => [s.productId, s.soldCount]));
  const categories = categoriesForActiveShift(categoriesWithProducts, soldByProductId, kind);

  const text = buildShiftText({
    kind,
    startedAt: activeShift.startedAt,
    endedAt: null,
    categories,
    signOffName: capitalizeName(auth.user.username),
  });

  return NextResponse.json({ text });
}
