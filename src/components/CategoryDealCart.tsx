"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProductRow from "@/components/ProductRow";
import { fetchWithTimeout, describeFetchError } from "@/lib/fetchWithTimeout";
import { notifyStockUpdated } from "@/lib/updateSignal";
import { resolveEffectiveDeal } from "@/lib/pricing";
import { formatPrice } from "@/lib/price";

type Product = {
  id: string;
  name: string;
  stockCount: number;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
  dealQuantity: number | null;
  dealPriceCents: number | null;
};

type Deal = { dealQuantity: number; dealPriceCents: number };

export default function CategoryDealCart({
  categoryCashPriceCents,
  categoryCardPriceCents,
  categoryDealQuantity,
  categoryDealPriceCents,
  products,
  soldByProductId,
  hasActiveShift,
}: {
  categoryCashPriceCents: number | null;
  categoryCardPriceCents: number | null;
  categoryDealQuantity: number | null;
  categoryDealPriceCents: number | null;
  products: Product[];
  soldByProductId: Map<string, number>;
  hasActiveShift: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [staged, setStaged] = useState<Map<string, number>>(new Map());
  const [lockedDeal, setLockedDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasCategoryPrice = categoryCashPriceCents !== null || categoryCardPriceCents !== null;
  const categoryFields = {
    cashPriceCents: categoryCashPriceCents,
    cardPriceCents: categoryCardPriceCents,
    dealQuantity: categoryDealQuantity,
    dealPriceCents: categoryDealPriceCents,
  };

  const stagedProducts = Array.from(staged.entries())
    .map(([productId, quantity]) => ({ product: products.find((p) => p.id === productId), quantity }))
    .filter((entry): entry is { product: Product; quantity: number } => !!entry.product);
  const totalStaged = stagedProducts.reduce((sum, s) => sum + s.quantity, 0);
  const canCharge = lockedDeal !== null && totalStaged > 0 && totalStaged % lockedDeal.dealQuantity === 0;
  const previewTotalCents = lockedDeal
    ? Math.floor(totalStaged / lockedDeal.dealQuantity) * lockedDeal.dealPriceCents
    : 0;

  function addToCart(product: Product, quantity: number) {
    const deal = resolveEffectiveDeal(product, categoryFields);
    if (!deal) return;
    if (lockedDeal && (lockedDeal.dealQuantity !== deal.dealQuantity || lockedDeal.dealPriceCents !== deal.dealPriceCents)) {
      setError("This item's deal doesn't match what's already in the cart — clear the cart first");
      return;
    }
    setError(null);
    setLockedDeal(deal);
    setStaged((prev) => {
      const next = new Map(prev);
      next.set(product.id, (next.get(product.id) ?? 0) + quantity);
      return next;
    });
  }

  function clearCart() {
    setStaged(new Map());
    setLockedDeal(null);
    setError(null);
  }

  function handleCharge() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchWithTimeout("/api/deals/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: Array.from(staged.entries()).map(([productId, quantity]) => ({ productId, quantity })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to charge deal");
          return;
        }
        clearCart();
        notifyStockUpdated();
        router.refresh();
      } catch (err) {
        setError(describeFetchError(err));
      }
    });
  }

  return (
    <>
      {products.length === 0 ? (
        <p className="text-sm text-zinc-400">No products yet.</p>
      ) : (
        products.map((product) => {
          const deal = resolveEffectiveDeal(product, categoryFields);
          const dealMatchesCart =
            !!deal &&
            (!lockedDeal || (lockedDeal.dealQuantity === deal.dealQuantity && lockedDeal.dealPriceCents === deal.dealPriceCents));

          return (
            <ProductRow
              key={product.id}
              productId={product.id}
              name={product.name}
              stockCount={product.stockCount}
              soldCount={soldByProductId.get(product.id) ?? null}
              hasActiveShift={hasActiveShift}
              cashPriceCents={product.cashPriceCents}
              cardPriceCents={product.cardPriceCents}
              dealNote={product.dealNote}
              dealQuantity={product.dealQuantity}
              dealPriceCents={product.dealPriceCents}
              showPriceEditor={!hasCategoryPrice}
              onAddToDeal={dealMatchesCart ? (quantity) => addToCart(product, quantity) : undefined}
              dealCartQuantity={staged.get(product.id) ?? 0}
            />
          );
        })
      )}

      {staged.size > 0 && (
        <div className="sticky bottom-2 mt-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/80 backdrop-blur-xl p-3 text-sm">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Deal cart: {stagedProducts.map((s) => `${s.product.name} ×${s.quantity}`).join(", ")}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
            {canCharge
              ? `${totalStaged} items — charge ${formatPrice(previewTotalCents)}`
              : `Need a multiple of ${lockedDeal?.dealQuantity ?? "?"}, have ${totalStaged}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCharge}
              disabled={!canCharge || isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Charge {canCharge ? formatPrice(previewTotalCents) : ""}
            </button>
            <button
              onClick={clearCart}
              className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
            >
              Clear
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </>
  );
}
