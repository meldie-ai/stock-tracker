"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout, describeFetchError } from "@/lib/fetchWithTimeout";
import { notifyStockUpdated } from "@/lib/updateSignal";
import { formatPrice, centsToInputValue, parsePriceInput } from "@/lib/price";

const LOW_STOCK_THRESHOLD = 3; // easy to adjust; low-stock = 0 < stockCount <= this

export default function ProductRow({
  productId,
  name,
  stockCount,
  soldCount,
  hasActiveShift,
  cashPriceCents,
  cardPriceCents,
  dealNote,
  showPriceEditor = true,
}: {
  productId: string;
  name: string;
  stockCount: number;
  soldCount: number | null;
  hasActiveShift: boolean;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
  showPriceEditor?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sellQty, setSellQty] = useState("1");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState(String(stockCount));
  const [priceOpen, setPriceOpen] = useState(false);
  const [cashPriceValue, setCashPriceValue] = useState(centsToInputValue(cashPriceCents));
  const [cardPriceValue, setCardPriceValue] = useState(centsToInputValue(cardPriceCents));
  const [dealNoteValue, setDealNoteValue] = useState(dealNote ?? "");
  const [error, setError] = useState<string | null>(null);

  const soldOut = stockCount === 0;
  const lowStock = stockCount > 0 && stockCount <= LOW_STOCK_THRESHOLD;
  const rowBgClass = soldOut
    ? "bg-red-50 dark:bg-red-950/40"
    : lowStock
      ? "bg-amber-50 dark:bg-amber-950/40"
      : "bg-green-50 dark:bg-green-950/40";
  const stockColorClass = soldOut
    ? "text-red-800 dark:text-red-300"
    : lowStock
      ? "text-amber-800 dark:text-amber-300"
      : "text-green-800 dark:text-green-300";

  function handleSell() {
    const quantity = Number(sellQty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Enter a positive whole number");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchWithTimeout(`/api/products/${productId}/sell`, {
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
        notifyStockUpdated();
        router.refresh();
      } catch (err) {
        setError(describeFetchError(err));
      }
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
      try {
        const res = await fetchWithTimeout(`/api/products/${productId}/adjust`, {
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
        notifyStockUpdated();
        router.refresh();
      } catch (err) {
        setError(describeFetchError(err));
      }
    });
  }

  function handlePriceSave() {
    const cash = parsePriceInput(cashPriceValue);
    const card = parsePriceInput(cardPriceValue);
    if (cash === "invalid" || card === "invalid") {
      setError("Enter a price of 0 or more");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchWithTimeout(`/api/products/${productId}/price`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashPriceCents: cash,
            cardPriceCents: card,
            dealNote: dealNoteValue.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to save price");
          return;
        }
        setPriceOpen(false);
        router.refresh();
      } catch (err) {
        setError(describeFetchError(err));
      }
    });
  }

  return (
    <div className={`rounded-lg px-3 py-3 mb-1.5 last:mb-0 ${rowBgClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {name}
          </p>
          <p className="text-xs text-zinc-500">
            Stock: <span className={`font-semibold ${stockColorClass}`}>{stockCount}</span>
            {hasActiveShift && (
              <>
                {" "}
                · Sold this shift: <span className="font-semibold">{soldCount ?? 0}</span>
              </>
            )}
            {showPriceEditor && cashPriceCents !== null && (
              <>
                {" · "}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  Cash {formatPrice(cashPriceCents)}
                </span>
              </>
            )}
            {showPriceEditor && cardPriceCents !== null && (
              <>
                {" · "}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  Card {formatPrice(cardPriceCents)}
                </span>
              </>
            )}
            {showPriceEditor && dealNote && <> · {dealNote}</>}
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

      {showPriceEditor && (
        <div className="mt-1">
          {!priceOpen ? (
            <button
              onClick={() => {
                setCashPriceValue(centsToInputValue(cashPriceCents));
                setCardPriceValue(centsToInputValue(cardPriceCents));
                setDealNoteValue(dealNote ?? "");
                setPriceOpen(true);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Edit price &amp; deal
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-500">Cash $</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cash"
                value={cashPriceValue}
                onChange={(e) => setCashPriceValue(e.target.value)}
                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm text-center"
              />
              <span className="text-xs text-zinc-500">Card $</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Card"
                value={cardPriceValue}
                onChange={(e) => setCardPriceValue(e.target.value)}
                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm text-center"
              />
              <input
                type="text"
                placeholder="Deal note, e.g. 3 for $50"
                value={dealNoteValue}
                onChange={(e) => setDealNoteValue(e.target.value)}
                className="min-w-[140px] flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
              />
              <button
                onClick={handlePriceSave}
                disabled={isPending}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Save
              </button>
              <button
                onClick={() => setPriceOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
