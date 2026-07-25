import { prisma } from "@/lib/prisma";
import type { ShiftTextCategory } from "@/lib/textTemplates";

export async function getCategoriesWithProducts() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: { orderBy: { name: "asc" } },
    },
  });
}

export async function getLastStockUpdateTime(): Promise<Date | null> {
  const result = await prisma.product.aggregate({ _max: { updatedAt: true } });
  return result._max.updatedAt;
}

export async function getActiveShift() {
  return prisma.shift.findFirst({
    where: { status: "ACTIVE" },
    include: { sales: true },
  });
}

export async function getClosedShiftsWithinDays(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.shift.findMany({
    where: { status: "CLOSED", endedAt: { gte: since } },
    orderBy: { endedAt: "desc" },
  });
}

export async function getShiftDetail(shiftId: string) {
  return prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      sales: { orderBy: [{ categorySortOrder: "asc" }, { productNameSnapshot: "asc" }] },
      stockSnapshots: {
        orderBy: [{ categorySortOrder: "asc" }, { productNameSnapshot: "asc" }],
      },
      startedByUser: { select: { username: true } },
    },
  });
}

/** Groups flat (category, product, value) rows back into categories, preserving DB order. */
export function groupByCategory(
  rows: { categoryNameSnapshot: string; productNameSnapshot: string; value: number }[]
): ShiftTextCategory[] {
  const categories: ShiftTextCategory[] = [];
  const byName = new Map<string, ShiftTextCategory>();

  for (const row of rows) {
    let category = byName.get(row.categoryNameSnapshot);
    if (!category) {
      category = { name: row.categoryNameSnapshot, products: [] };
      byName.set(row.categoryNameSnapshot, category);
      categories.push(category);
    }
    category.products.push({ name: row.productNameSnapshot, value: row.value });
  }

  return categories;
}
