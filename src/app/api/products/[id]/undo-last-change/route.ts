import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest, shiftOwnershipError } from "@/lib/apiHelpers";
import { recordAuditEntry } from "@/lib/auditLog";
import { resolveUnitPriceCents } from "@/lib/pricing";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Reverses the single most recent thing that happened to a product this shift — a plain
 * Cash/Card sale, or a stock adjustment — but only while it's still the last thing that
 * happened (undoing an undo isn't supported). If that sale/adjustment also triggered a
 * cascade into a linked carton (opening one to cover a shortfall, or refilling after hitting
 * 0), every entry sharing its groupId is reversed together in the same transaction — each
 * product restored to that entry's own recorded stockBefore, newest-first so a product
 * touched twice in one group (e.g. a Singles item's sale and its own top-up) converges on
 * the oldest, truly original value. Every product in the group must still have its group
 * entry as its own true last action, or the whole group is rejected rather than partially
 * reversed. Deal sales aren't undoable here — a deal sale can span several products
 * atomically and its revenue isn't a plain per-unit price, so it can't be reconstructed from
 * the current price the way a plain sale's can.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const { id: productId } = await params;

  const activeShift = await prisma.shift.findFirst({
    where: { status: "ACTIVE" },
    include: { startedByUser: { select: { username: true } } },
  });
  if (!activeShift) {
    return NextResponse.json({ error: "Start a shift to do this" }, { status: 409 });
  }
  const ownershipError = shiftOwnershipError(activeShift, auth.user);
  if (ownershipError) return ownershipError;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productExists = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });
      if (!productExists) throw new Error("NOT_FOUND");

      // The literal last thing recorded for this product. If a sale/adjustment on
      // it triggered a refill-to-full cascade (hit exactly 0), that refill — not the
      // sale/adjustment itself — is now this product's last entry, so find the
      // actual SELL/ADJUST among everything sharing its groupId instead of assuming
      // the anchor entry IS it.
      const anchorEntry = await tx.auditLog.findFirst({
        where: { shiftId: activeShift.id, productId },
        orderBy: { createdAt: "desc" },
      });
      if (!anchorEntry) throw new Error("NOTHING_TO_UNDO");

      // Every entry this sale/adjustment is linked to (itself, plus any CASCADE
      // entries it triggered on a different product) — or just itself if it
      // never touched anything else.
      const groupEntries = anchorEntry.groupId
        ? await tx.auditLog.findMany({ where: { groupId: anchorEntry.groupId } })
        : [anchorEntry];

      const primaryEntry = groupEntries.find((e) => e.action === "SELL" || e.action === "ADJUST");
      if (!primaryEntry || !primaryEntry.productId) throw new Error("NOTHING_TO_UNDO");

      let paymentMethod: PaymentMethod | null = null;
      let revenueCents = 0;
      let shiftSaleQuantity = 0;

      if (primaryEntry.action === "SELL") {
        paymentMethod =
          primaryEntry.note === "Cash sale" ? "CASH" : primaryEntry.note === "Card sale" ? "CARD" : null;
        if (!paymentMethod) throw new Error("NOTHING_TO_UNDO");

        const primaryProduct = await tx.product.findUnique({
          where: { id: primaryEntry.productId },
          include: { category: true },
        });
        if (!primaryProduct) throw new Error("NOTHING_TO_UNDO");

        shiftSaleQuantity = -primaryEntry.quantityDelta;
        const unitPriceCents = resolveUnitPriceCents(primaryProduct, primaryProduct.category, paymentMethod);
        revenueCents = (unitPriceCents ?? 0) * shiftSaleQuantity;
      }

      // Keep only the most recent entry per product within the group — a
      // product can appear twice (e.g. a Singles sale plus its own refill).
      const latestByProductId = new Map<string, (typeof groupEntries)[number]>();
      for (const entry of groupEntries) {
        if (!entry.productId) continue;
        const existing = latestByProductId.get(entry.productId);
        if (!existing || entry.createdAt > existing.createdAt) {
          latestByProductId.set(entry.productId, entry);
        }
      }

      // Safety check: every affected product must still have its group entry as
      // its own true last action. If anything else happened to any of them since
      // (including the linked carton), reversing would be unsafe — reject the
      // whole group rather than partially undo it.
      for (const [pid, entry] of latestByProductId) {
        const trueLast = await tx.auditLog.findFirst({
          where: { productId: pid },
          orderBy: { createdAt: "desc" },
        });
        if (!trueLast || trueLast.id !== entry.id) throw new Error("GROUP_CHANGED");
      }

      const affectedProductIds = Array.from(latestByProductId.keys());
      const liveProducts = await tx.product.findMany({
        where: { id: { in: affectedProductIds } },
        select: { id: true, stockCount: true },
      });
      const liveStockByProductId = new Map(liveProducts.map((p) => [p.id, p.stockCount]));

      // Reverse every entry's product to that entry's own stockBefore, newest
      // first, so a product appearing twice in the group ends up at the
      // oldest (truly original) recorded value, not an intermediate one.
      const sortedEntries = [...groupEntries].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      for (const entry of sortedEntries) {
        if (!entry.productId) continue;
        await tx.product.update({
          where: { id: entry.productId },
          data: { stockCount: entry.stockBefore },
        });
      }

      const finalProducts = await tx.product.findMany({
        where: { id: { in: affectedProductIds } },
        select: { id: true, stockCount: true },
      });
      const finalStockByProductId = new Map(finalProducts.map((p) => [p.id, p.stockCount]));

      if (paymentMethod) {
        const shiftSale = await tx.shiftSale.findUnique({
          where: {
            shiftId_productId_paymentMethod: {
              shiftId: activeShift.id,
              productId: primaryEntry.productId,
              paymentMethod,
            },
          },
        });
        if (!shiftSale) throw new Error("NOTHING_TO_UNDO");

        await tx.shiftSale.update({
          where: { id: shiftSale.id },
          data: {
            soldCount: Math.max(0, shiftSale.soldCount - shiftSaleQuantity),
            revenueCentsCollected: Math.max(0, shiftSale.revenueCentsCollected - revenueCents),
          },
        });
      }

      await tx.auditLog.deleteMany({ where: { id: { in: groupEntries.map((e) => e.id) } } });

      for (const [pid, entry] of latestByProductId) {
        const isPrimary = pid === primaryEntry.productId;
        const note = isPrimary
          ? primaryEntry.action === "SELL"
            ? `Undid ${paymentMethod === "CASH" ? "Cash" : "Card"} sale of ${shiftSaleQuantity}`
            : `Undid adjustment (was: ${primaryEntry.note ?? "no reason given"})`
          : `Undid: ${entry.note ?? entry.action}`;

        await recordAuditEntry(tx, {
          action: "UNDO",
          userId: auth.user.userId,
          usernameSnapshot: auth.user.username,
          productId: pid,
          productNameSnapshot: entry.productNameSnapshot,
          categoryNameSnapshot: entry.categoryNameSnapshot,
          quantityDelta: finalStockByProductId.get(pid)! - liveStockByProductId.get(pid)!,
          stockBefore: liveStockByProductId.get(pid)!,
          stockAfter: finalStockByProductId.get(pid)!,
          shiftId: activeShift.id,
          note,
        });
      }

      let soldCount: number | null = null;
      if (paymentMethod) {
        const totalSold = await tx.shiftSale.aggregate({
          where: { shiftId: activeShift.id, productId },
          _sum: { soldCount: true },
        });
        soldCount = totalSold._sum.soldCount ?? 0;
      }

      return { stockCount: finalStockByProductId.get(productId)!, soldCount };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "NOTHING_TO_UNDO") {
      return NextResponse.json(
        { error: "Nothing to undo — use Adjust stock instead" },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message === "GROUP_CHANGED") {
      return NextResponse.json(
        { error: "Can't undo — something else has changed since (e.g. the linked carton)" },
        { status: 409 }
      );
    }
    throw err;
  }
}
