"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const LOW_STOCK_THRESHOLD = 3; // easy to adjust; low-stock = 0 < stockCount <= this

export default function ProductRow({
  productId,
  name,
  stockCount,
  soldCount,
  hasActiveShift,
}: {
  productId: string;
  name: string;
  stockCount: number;
  soldCount: number | null;
  hasActiveShift: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sellQty, setSellQty] = useState("1");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState(String(stockCount));
  const [error, setError] = useState<string | null>(null);

  const soldOut = stockCount === 0;
  const lowStock = stockCount > 0 && stockCount <= LOW_STOCK_THRESHOLD;

  function handleSell() {
    const quantity = Number(sellQty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Enter a positive whole number");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/products/${productId}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to record sale");
        return;
      }
      setSellQty("1");
      router.refresh();
    });
  }

  function handleAdjustSave() {
    const value = Number(adjustValue);
    if (!Number.isInteger(value) || value < 0) {
      setError("Enter a whole number, 0 or more");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/products/${productId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "set", value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to adjust stock");
        return;
      }
      setAdjustOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-900 py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {name}
          </p>
          <p className="text-xs text-zinc-500">
            Stock:{" "}
            <span
              className={
                lowStock
                  ? "font-semibold text-amber-600 dark:text-amber-400"
                  : "font-semibold"
              }
            >
              {stockCount}
            </span>
            {hasActiveShift && (
              <>
                {" "}
                · Sold this shift: <span className="font-semibold">{soldCount ?? 0}</span>
              </>
            )}
          </p>
        </div>

        {hasActiveShift &&
          (soldOut ? (
            <span className="rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2.5 py-1 text-xs font-semibold shrink-0">
              Sold Out
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                className="w-14 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm text-center"
              />
              <button
                onClick={handleSell}
                disabled={isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Sell
              </button>
            </div>
          ))}
      </div>

      <div className="mt-1">
        {!adjustOpen ? (
          <button
            onClick={() => {
              setAdjustValue(String(stockCount));
              setAdjustOpen(true);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Adjust stock (restock/correction — not a sale)
          </button>
        ) : (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-zinc-500">Set stock to</span>
            <input
              type="number"
              min={0}
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
              className="w-16 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm text-center"
            />
            <button
              onClick={handleAdjustSave}
              disabled={isPending}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Save
            </button>
            <button
              onClick={() => setAdjustOpen(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
