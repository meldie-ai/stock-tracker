import { prisma } from "@/lib/prisma";
import { getLastCompletedWeekRange } from "@/lib/dateFormat";
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
    include: { sales: true, startedByUser: { select: { username: true } } },
  });
}

/** Maps the live catalog + this shift's sale counts into text-template shape for SOLD or STOCK. */
export function categoriesForActiveShift(
  categoriesWithProducts: Awaited<ReturnType<typeof getCategoriesWithProducts>>,
  soldByProductId: Map<string | null, number>,
  kind: "SOLD" | "STOCK"
): ShiftTextCategory[] {
  return categoriesWithProducts.map((category) => ({
    name: category.name,
    products: category.products.map((product) => ({
      name: product.name,
      value: kind === "STOCK" ? product.stockCount : soldByProductId.get(product.id) ?? 0,
    })),
  }));
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
      endedByUser: { select: { username: true } },
    },
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      deactivatedAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function getAuditLog(filters: { userId?: string; productId?: string }) {
  return prisma.auditLog.findMany({
    where: {
      userId: filters.userId,
      productId: filters.productId,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * since/until for the weekly report: the last completed Monday-Sunday week, not the
 * in-progress current one. `until` is exclusive. Re-exported from dateFormat so callers
 * only need to import from one place.
 */
export const getWeeklyReportDateRange = getLastCompletedWeekRange;

function aggregateByProduct(
  rows: { categoryNameSnapshot: string; productNameSnapshot: string; value: number }[]
): { categoryNameSnapshot: string; productNameSnapshot: string; value: number }[] {
  const byKey = new Map<string, { categoryNameSnapshot: string; productNameSnapshot: string; value: number }>();
  for (const row of rows) {
    const key = `${row.categoryNameSnapshot} ${row.productNameSnapshot}`;
    const existing = byKey.get(key);
    if (existing) existing.value += row.value;
    else byKey.set(key, { ...row });
  }
  // Shift-close snapshots a row per catalog product (soldCount 0 for anything unsold that
  // shift) so History can show the full list — drop those zero-total rows here since a
  // summary report should only surface products that actually had activity.
  return Array.from(byKey.values())
    .filter((row) => row.value > 0)
    .sort(
      (a, b) =>
        a.categoryNameSnapshot.localeCompare(b.categoryNameSnapshot) ||
        a.productNameSnapshot.localeCompare(b.productNameSnapshot)
    );
}

/** Total units sold per product during the last completed Monday-Sunday week. */
export async function getWeeklySoldSummary() {
  const { since, until } = getWeeklyReportDateRange();
  const sales = await prisma.shiftSale.findMany({
    where: { shift: { startedAt: { gte: since, lt: until } } },
    select: {
      categoryNameSnapshot: true,
      productNameSnapshot: true,
      soldCount: true,
      product: { select: { name: true, category: { select: { name: true } } } },
    },
  });
  // Prefer the product's *current* name/category over the snapshot frozen at sale time —
  // a category or product rename mid-week would otherwise split one item's activity across
  // two entries (e.g. "CARTONS" and "CARTONS!!!" if the category got renamed that week).
  // Snapshot is only a fallback for a product that's since been deleted (productId -> null).
  return aggregateByProduct(
    sales.map((s) => ({
      categoryNameSnapshot: s.product?.category.name ?? s.categoryNameSnapshot,
      productNameSnapshot: s.product?.name ?? s.productNameSnapshot,
      value: s.soldCount,
    }))
  );
}

/** Total units restocked (positive Adjust-stock corrections) per product during the last completed week. */
export async function getWeeklyRestockedSummary() {
  const { since, until } = getWeeklyReportDateRange();
  const entries = await prisma.auditLog.findMany({
    where: { action: "ADJUST", quantityDelta: { gt: 0 }, createdAt: { gte: since, lt: until } },
    select: {
      categoryNameSnapshot: true,
      productNameSnapshot: true,
      quantityDelta: true,
      product: { select: { name: true, category: { select: { name: true } } } },
    },
  });
  return aggregateByProduct(
    entries.map((e) => ({
      categoryNameSnapshot: e.product?.category.name ?? e.categoryNameSnapshot,
      productNameSnapshot: e.product?.name ?? e.productNameSnapshot,
      value: e.quantityDelta,
    }))
  );
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
