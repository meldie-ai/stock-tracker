import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { dealSellSchema } from "@/lib/validation";
import { resolveEffectiveDeal } from "@/lib/pricing";
import { tryCascadeSinglesFromCarton } from "@/lib/cartonCascade";
import { recordAuditEntry } from "@/lib/auditLog";

// Deals are cash-only and can span different products — but only ones that share the
// exact same configured deal (same bundle quantity + same total price). Deliberately
// not nested under a category route: validity is defined by matching product-level
// deal terms (resolved the same category-overrides-product way as unit price), not by
// a single category's config, since e.g. different cigarette brands in one category
// can carry different deal tiers that must not mix.
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = dealSellSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deal items" }, { status: 400 });
  }
  const { items } = parsed.data;

  const productIds = items.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    return NextResponse.json({ error: "Duplicate product in deal" }, { status: 400 });
  }

  const activeShift = await prisma.shift.findFirst({ where: { status: "ACTIVE" } });
  if (!activeShift) {
    return NextResponse.json({ error: "Start a shift to do this" }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      });
      if (products.length !== productIds.length) throw new Error("NOT_FOUND");
      const productById = new Map(products.map((p) => [p.id, p]));

      let sharedDeal: { dealQuantity: number; dealPriceCents: number } | null = null;
      for (const product of products) {
        const deal = resolveEffectiveDeal(product, product.category);
        if (!deal) throw new Error(`NO_DEAL:${product.name}`);
        if (
          sharedDeal &&
          (sharedDeal.dealQuantity !== deal.dealQuantity ||
            sharedDeal.dealPriceCents !== deal.dealPriceCents)
        ) {
          throw new Error("DEAL_MISMATCH");
        }
        sharedDeal = deal;
      }
      if (!sharedDeal) throw new Error("NOT_FOUND");

      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
      if (totalQuantity % sharedDeal.dealQuantity !== 0) {
        throw new Error(`NOT_MULTIPLE:${sharedDeal.dealQuantity}`);
      }

      const bundleCount = totalQuantity / sharedDeal.dealQuantity;
      const totalPriceCents = bundleCount * sharedDeal.dealPriceCents;
      const baseUnitCents = Math.floor(totalPriceCents / totalQuantity);
      const remainderCents = totalPriceCents - baseUnitCents * totalQuantity;

      let unitsAllocated = 0;
      const resultItems: { productId: string; stockCount: number }[] = [];

      for (const item of items) {
        const product = productById.get(item.productId)!;
        if (product.stockCount < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        }

        const extraCents = Math.max(
          0,
          Math.min(item.quantity, remainderCents - unitsAllocated)
        );
        const itemRevenueCents = baseUnitCents * item.quantity + extraCents;
        unitsAllocated += item.quantity;

        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { stockCount: { decrement: item.quantity } },
        });

        await recordAuditEntry(tx, {
          action: "SELL",
          userId: auth.user.userId,
          usernameSnapshot: auth.user.username,
          productId: product.id,
          productNameSnapshot: product.name,
          categoryNameSnapshot: product.category.name,
          quantityDelta: -item.quantity,
          stockBefore: product.stockCount,
          stockAfter: updatedProduct.stockCount,
          shiftId: activeShift.id,
          note: "Deal sale",
        });

        let finalStockCount = updatedProduct.stockCount;
        const cascade = await tryCascadeSinglesFromCarton(tx, {
          productName: product.name,
          linkedCartonProductId: product.linkedCartonProductId,
          newStockCount: updatedProduct.stockCount,
          userId: auth.user.userId,
          usernameSnapshot: auth.user.username,
          shiftId: activeShift.id,
        });
        if (cascade.cascaded) {
          const refilled = await tx.product.update({
            where: { id: item.productId },
            data: { stockCount: cascade.singlesStockCount },
          });
          finalStockCount = refilled.stockCount;

          await recordAuditEntry(tx, {
            action: "CASCADE",
            userId: auth.user.userId,
            usernameSnapshot: auth.user.username,
            productId: product.id,
            productNameSnapshot: product.name,
            categoryNameSnapshot: product.category.name,
            quantityDelta: refilled.stockCount,
            stockBefore: 0,
            stockAfter: refilled.stockCount,
            shiftId: activeShift.id,
            note: "Auto-refilled from linked carton product",
          });
        }

        await tx.shiftSale.upsert({
          where: {
            shiftId_productId_paymentMethod: {
              shiftId: activeShift.id,
              productId: item.productId,
              paymentMethod: "CASH",
            },
          },
          create: {
            shiftId: activeShift.id,
            productId: item.productId,
            productNameSnapshot: product.name,
            categoryNameSnapshot: product.category.name,
            categorySortOrder: product.category.sortOrder,
            sortOrder: product.sortOrder,
            soldCount: item.quantity,
            paymentMethod: "CASH",
            revenueCentsCollected: itemRevenueCents,
          },
          update: {
            soldCount: { increment: item.quantity },
            revenueCentsCollected: { increment: itemRevenueCents },
          },
        });

        resultItems.push({ productId: item.productId, stockCount: finalStockCount });
      }

      return { totalPriceCents, items: resultItems };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message.startsWith("NO_DEAL:")) {
      return NextResponse.json(
        { error: `${err.message.slice("NO_DEAL:".length)} has no deal configured` },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "DEAL_MISMATCH") {
      return NextResponse.json({ error: "Items must share the same deal" }, { status: 400 });
    }
    if (err instanceof Error && err.message.startsWith("NOT_MULTIPLE:")) {
      const dealQuantity = err.message.slice("NOT_MULTIPLE:".length);
      return NextResponse.json(
        { error: `Quantity must be an exact multiple of ${dealQuantity} for this deal` },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json(
        { error: `Not enough stock for ${err.message.slice("INSUFFICIENT_STOCK:".length)}` },
        { status: 400 }
      );
    }
    throw err;
  }
}
