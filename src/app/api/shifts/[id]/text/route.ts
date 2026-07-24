import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { getShiftDetail, groupByCategory } from "@/lib/data";
import { buildShiftText, capitalizeName } from "@/lib/textTemplates";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "SOLD" && kind !== "STOCK") {
    return NextResponse.json({ error: "kind must be SOLD or STOCK" }, { status: 400 });
  }

  const { id } = await params;
  const shift = await getShiftDetail(id);
  if (!shift || shift.status !== "CLOSED" || !shift.endedAt) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const categories =
    kind === "SOLD"
      ? groupByCategory(
          shift.sales.map((s) => ({
            categoryNameSnapshot: s.categoryNameSnapshot,
            productNameSnapshot: s.productNameSnapshot,
            value: s.soldCount,
          }))
        )
      : groupByCategory(
          shift.stockSnapshots.map((s) => ({
            categoryNameSnapshot: s.categoryNameSnapshot,
            productNameSnapshot: s.productNameSnapshot,
            value: s.stockCountAtClose,
          }))
        );

  const text = buildShiftText({
    kind,
    startedAt: shift.startedAt,
    endedAt: shift.endedAt,
    categories,
    signOffName: capitalizeName(shift.startedByUser.username),
  });

  return NextResponse.json({ text });
}
