"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout, describeFetchError } from "@/lib/fetchWithTimeout";
import { formatPrice, centsToInputValue, parsePriceInput } from "@/lib/price";

export default function CategoryPriceEditor({
  categoryId,
  cashPriceCents,
  cardPriceCents,
  dealNote,
  dealQuantity,
  dealPriceCents,
  isShiftOwner,
}: {
  categoryId: string;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
  dealQuantity: number | null;
  dealPriceCents: number | null;
  isShiftOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [cashPriceValue, setCashPriceValue] = useState(centsToInputValue(cashPriceCents));
  const [cardPriceValue, setCardPriceValue] = useState(centsToInputValue(cardPriceCents));
  const [dealQuantityValue, setDealQuantityValue] = useState(dealQuantity !== null ? String(dealQuantity) : "");
  const [dealPriceValue, setDealPriceValue] = useState(centsToInputValue(dealPriceCents));
  const [error, setError] = useState<string | null>(null);

  const hasPrice = cashPriceCents !== null || cardPriceCents !== null;
  const hasDeal = dealQuantity !== null && dealPriceCents !== null;

  function handleUseIndividual() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchWithTimeout(`/api/categories/${categoryId}/price`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashPriceCents: null,
            cardPriceCents: null,
            dealNote: null,
            dealQuantity: null,
            dealPriceCents: null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to update price");
          return;
        }
        router.refresh();
      } catch (err) {
        setError(describeFetchError(err));
      }
    });
  }

  function handleSave() {
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
        const res = await fetchWithTimeout(`/api/categories/${categoryId}/price`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashPriceCents: cash,
            cardPriceCents: card,
            // This form has no field to set a dealNote, and a structured deal
            // (or none) always supersedes it — clear it on every save so an
            // old note can't linger behind a cleared or changed deal.
            dealNote: null,
            dealQuantity: dealQty,
            dealPriceCents: dealPrice,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to save price");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(describeFetchError(err));
      }
    });
  }

  return (
    <div className="mb-2">
      {(hasPrice || hasDeal) && (
        <p className="text-xs text-zinc-500 mb-1">
          {cashPriceCents !== null && (
            <span className="font-semibold text-red-600 dark:text-red-400">
              Cash {formatPrice(cashPriceCents)} each
            </span>
          )}
          {cashPriceCents !== null && cardPriceCents !== null && " · "}
          {cardPriceCents !== null && (
            <span className="font-semibold text-red-600 dark:text-red-400">
              Card {formatPrice(cardPriceCents)} each
            </span>
          )}
          {hasDeal ? (
            <>
              {" · "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                Deal: {dealQuantity} for {formatPrice(dealPriceCents!)} (cash)
              </span>
            </>
          ) : (
            dealNote && <> · {dealNote}</>
          )}
        </p>
      )}
      {!isShiftOwner ? null : !open ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Price</span>
          <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
            <button
              onClick={() => {
                setCashPriceValue(centsToInputValue(cashPriceCents));
                setCardPriceValue(centsToInputValue(cardPriceCents));
                setDealQuantityValue(dealQuantity !== null ? String(dealQuantity) : "");
                setDealPriceValue(centsToInputValue(dealPriceCents));
                setOpen(true);
              }}
              disabled={isPending}
              className={`px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                hasPrice
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              Category
            </button>
            <button
              onClick={() => {
                if (hasPrice) handleUseIndividual();
              }}
              disabled={isPending}
              className={`border-l border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                !hasPrice
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              Individual
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
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
          {(dealQuantityValue !== "" || dealPriceValue !== "") && (
            <button
              onClick={() => {
                setDealQuantityValue("");
                setDealPriceValue("");
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              No deal
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Save
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
