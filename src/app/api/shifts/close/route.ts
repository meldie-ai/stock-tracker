import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { dayPartLabel, formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const activeShift = await prisma.shift.findFirst({ where: { status: "ACTIVE" } });
  if (!activeShift) {
    return NextResponse.json({ error: "No active shift" }, { status: 409 });
  }

  const endedAt = new Date();
  const dayLabel = `${dayPartLabel(activeShift.startedAt)} - ${dayPartLabel(endedAt)}`;
  const dateRangeLabel = `${formatDateDDMMYY(activeShift.startedAt)} - ${formatDateDDMMYY(endedAt)}`;
  const timeRangeLabel = `${formatTime12(activeShift.startedAt)}-${formatTime12(endedAt)}`;

  const [products, existingSales] = await Promise.all([
    prisma.product.findMany({ include: { category: true } }),
    prisma.shiftSale.findMany({
      where: { shiftId: activeShift.id },
      select: { productId: true },
    }),
  ]);
  const existingSaleProductIds = new Set(existingSales.map((s) => s.productId));
  // Ensure every current product has a sale row (defaults to 0) so the
  // historical "sold" list is complete, matching the stock snapshot below.
  const missingSaleProducts = products.filter((p) => !existingSaleProductIds.has(p.id));

  try {
    const closedShift = await prisma.$transaction(
      async (tx) => {
        if (missingSaleProducts.length > 0) {
          await tx.shiftSale.createMany({
            data: missingSaleProducts.map((product) => ({
              shiftId: activeShift.id,
              productId: product.id,
              productNameSnapshot: product.name,
              categoryNameSnapshot: product.category.name,
              categorySortOrder: product.category.sortOrder,
              sortOrder: product.sortOrder,
              soldCount: 0,
            })),
          });
        }

        await tx.shiftStockSnapshot.createMany({
          data: products.map((product) => ({
            shiftId: activeShift.id,
            productId: product.id,
            productNameSnapshot: product.name,
            categoryNameSnapshot: product.category.name,
            categorySortOrder: product.category.sortOrder,
            sortOrder: product.sortOrder,
            stockCountAtClose: product.stockCount,
          })),
        });

        return tx.shift.update({
          where: { id: activeShift.id },
          data: {
            status: "CLOSED",
            endedAt,
            endedByUserId: auth.user.userId,
            dayLabel,
            dateRangeLabel,
            timeRangeLabel,
          },
        });
      },
      { timeout: 15000 }
    );

    return NextResponse.json(closedShift);
  } catch (err) {
    console.error("Failed to close shift", err);
    return NextResponse.json({ error: "Failed to end shift" }, { status: 500 });
  }
}
