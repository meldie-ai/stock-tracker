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

/**
 * A product can now have up to two ShiftSale rows per shift (one per payment method), so
 * "sold this shift" must sum across them rather than assume one row per product.
 */
export function sumSoldByProductId(sales: { productId: string | null; soldCount: number }[]): Map<string, number> {
  const byProductId = new Map<string, number>();
  for (const sale of sales) {
    if (!sale.productId) continue;
    byProductId.set(sale.productId, (byProductId.get(sale.productId) ?? 0) + sale.soldCount);
  }
  return byProductId;
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

/** The last completed Monday-Sunday week, used as the report page's default range when no dates are picked. */
export const getWeeklyReportDateRange = getLastCompletedWeekRange;

/**
 * Sums rows sharing the same (category, product) together — e.g. a product's separate
 * cash/card ShiftSale rows for one shift, or its rows across several shifts in a date range.
 * Preserves input order and does not filter, so callers that need the full catalog (History)
 * can use this directly instead of the stricter aggregateByProduct below.
 */
export function sumDuplicateProductRows<
  T extends { categoryNameSnapshot: string; productNameSnapshot: string; value: number },
>(rows: T[]): { categoryNameSnapshot: string; productNameSnapshot: string; value: number }[] {
  const byKey = new Map<string, { categoryNameSnapshot: string; productNameSnapshot: string; value: number }>();
  for (const row of rows) {
    const key = `${row.categoryNameSnapshot} ${row.productNameSnapshot}`;
    const existing = byKey.get(key);
    if (existing) existing.value += row.value;
    else byKey.set(key, { categoryNameSnapshot: row.categoryNameSnapshot, productNameSnapshot: row.productNameSnapshot, value: row.value });
  }
  return Array.from(byKey.values());
}

function aggregateByProduct(
  rows: { categoryNameSnapshot: string; productNameSnapshot: string; value: number }[]
): { categoryNameSnapshot: string; productNameSnapshot: string; value: number }[] {
  // Shift-close snapshots a row per catalog product (soldCount 0 for anything unsold that
  // shift) so History can show the full list — drop those zero-total rows here since a
  // summary report should only surface products that actually had activity.
  return sumDuplicateProductRows(rows)
    .filter((row) => row.value > 0)
    .sort(
      (a, b) =>
        a.categoryNameSnapshot.localeCompare(b.categoryNameSnapshot) ||
        a.productNameSnapshot.localeCompare(b.productNameSnapshot)
    );
}

/** Total units sold per product within an arbitrary date range (until is exclusive). */
export async function getSoldSummary(since: Date, until: Date) {
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
  // a category or product rename mid-range would otherwise split one item's activity across
  // two entries (e.g. "CARTONS" and "CARTONS!!!" if the category got renamed in between).
  // Snapshot is only a fallback for a product that's since been deleted (productId -> null).
  return aggregateByProduct(
    sales.map((s) => ({
      categoryNameSnapshot: s.product?.category.name ?? s.categoryNameSnapshot,
      productNameSnapshot: s.product?.name ?? s.productNameSnapshot,
      value: s.soldCount,
    }))
  );
}

/** Total units restocked (positive Adjust-stock corrections) per product within an arbitrary date range. */
export async function getRestockedSummary(since: Date, until: Date) {
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

/**
 * Cash/card revenue for a date range. Sums the amount actually collected at the moment of
 * each sale (revenueCentsCollected), locked in at sale time by the sell/deal-sell routes —
 * not recomputed from current prices, so later price or deal changes never retroactively
 * alter past revenue, and deal sales (priced as a bundle, not per-unit) are represented
 * correctly. Only counts rows with a recorded payment method (rows from before that feature
 * existed are skipped, though their quantity still shows in getSoldSummary).
 */
export async function getRevenueSummary(since: Date, until: Date) {
  const sums = await prisma.shiftSale.groupBy({
    by: ["paymentMethod"],
    where: { shift: { startedAt: { gte: since, lt: until } }, paymentMethod: { not: null } },
    _sum: { revenueCentsCollected: true },
  });

  const cashRevenueCents = sums.find((s) => s.paymentMethod === "CASH")?._sum.revenueCentsCollected ?? 0;
  const cardRevenueCents = sums.find((s) => s.paymentMethod === "CARD")?._sum.revenueCentsCollected ?? 0;

  return { cashRevenueCents, cardRevenueCents, totalRevenueCents: cashRevenueCents + cardRevenueCents };
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
