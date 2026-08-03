"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout, describeFetchError } from "@/lib/fetchWithTimeout";
import { notifyStockUpdated } from "@/lib/updateSignal";
import { formatPrice, centsToInputValue, parsePriceInput } from "@/lib/price";
import { ADJUST_DEDUCTION_REASONS } from "@/lib/adjustReasons";

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
  dealQuantity,
  dealPriceCents,
  showPriceEditor = true,
  onAddToDeal,
  dealCartQuantity = 0,
}: {
  productId: string;
  name: string;
  stockCount: number;
  soldCount: number | null;
  hasActiveShift: boolean;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
  dealQuantity: number | null;
  dealPriceCents: number | null;
  showPriceEditor?: boolean;
  onAddToDeal?: (quantity: number) => void;
  dealCartQuantity?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sellQty, setSellQty] = useState("1");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState(String(stockCount));
  const [adjustReason, setAdjustReason] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);
  const [cashPriceValue, setCashPriceValue] = useState(centsToInputValue(cashPriceCents));
  const [cardPriceValue, setCardPriceValue] = useState(centsToInputValue(cardPriceCents));
  const [dealQuantityValue, setDealQuantityValue] = useState(dealQuantity !== null ? String(dealQuantity) : "");
  const [dealPriceValue, setDealPriceValue] = useState(centsToInputValue(dealPriceCents));
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

  function handleSell(paymentMethod: "CASH" | "CARD") {
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
          body: JSON.stringify({ quantity, paymentMethod }),
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

  function handleAddToDeal() {
    const quantity = Number(sellQty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Enter a positive whole number");
      return;
    }
    setError(null);
    onAddToDeal?.(quantity);
    setSellQty("1");
  }

  function handleAdjustSave() {
    const value = Number(adjustValue);
    if (!Number.isInteger(value) || value < 0) {
      setError("Enter a whole number, 0 or more");
      return;
    }
    const isDeduction = value < stockCount;
    if (isDeduction && !adjustReason) {
      setError("Select a reason for the deduction");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchWithTimeout(`/api/products/${productId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "set",
            value,
            ...(isDeduction ? { reason: adjustReason } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to adjust stock");
          return;
        }
        setAdjustOpen(false);
        setAdjustReason("");
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
    const dealQty = dealQuantityValue.trim() === "" ? null : Number(dealQuantityValue);
    const dealPrice = parsePriceInput(dealPriceValue);
    if (dealPrice === "invalid") {
      setError("Enter a deal price of 0 or more");
      return;
    }
    if (dealQty !== null && (!Number.isInteger(dealQty) || dealQty <= 0)) {
      setError("Deal quantity must be a positive whole number");
      return;
    }
    if ((dealQty === null) !== (dealPrice === null)) {
      setError("Enter both deal quantity and price, or leave both blank");
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
            dealQuantity: dealQty,
            dealPriceCents: dealPrice,
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {name}
            {dealCartQuantity > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-semibold align-middle">
                {dealCartQuantity} staged
              </span>
            )}
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
            {showPriceEditor && dealQuantity !== null && dealPriceCents !== null ? (
              <>
                {" · "}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  Deal: {dealQuantity} for {formatPrice(dealPriceCents)} (cash)
                </span>
              </>
            ) : (
              showPriceEditor && dealNote && <> · {dealNote}</>
            )}
          </p>
        </div>

        {hasActiveShift && soldOut && (
          <span className="rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2.5 py-1 text-xs font-semibold shrink-0">
            Sold Out
          </span>
        )}
      </div>

      {hasActiveShift && !soldOut && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
          <input
            type="number"
            min={1}
            value={sellQty}
            onChange={(e) => setSellQty(e.target.value)}
            className="w-14 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm text-center"
          />
          <button
            onClick={() => handleSell("CASH")}
            disabled={isPending}
            className="rounded-md bg-green-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Cash
          </button>
          <button
            onClick={() => handleSell("CARD")}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Card
          </button>
          {onAddToDeal && (
            <button
              onClick={handleAddToDeal}
              disabled={isPending}
              className="rounded-md border border-blue-600 px-2.5 py-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-50"
            >
              + Deal
            </button>
          )}
        </div>
      )}

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
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-1.5">
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
                onClick={() => {
                  setAdjustOpen(false);
                  setAdjustReason("");
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
            {adjustValue !== "" && Number(adjustValue) < stockCount && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Reason</span>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs"
                >
                  <option value="">Select a reason&hellip;</option>
                  {ADJUST_DEDUCTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                setDealQuantityValue(dealQuantity !== null ? String(dealQuantity) : "");
                setDealPriceValue(centsToInputValue(dealPriceCents));
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
              <span className="text-xs text-zinc-500">Deal: buy</span>
              <input
                type="number"
                min={1}
                step="1"
                placeholder="Qty"
                value={dealQuantityValue}
                onChange={(e) => setDealQuantityValue(e.target.value)}
                className="w-14 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm text-center"
              />
              <span className="text-xs text-zinc-500">for $ (cash)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Total"
                value={dealPriceValue}
                onChange={(e) => setDealPriceValue(e.target.value)}
                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm text-center"
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
