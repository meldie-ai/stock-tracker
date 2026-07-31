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
}: {
  categoryId: string;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [cashPriceValue, setCashPriceValue] = useState(centsToInputValue(cashPriceCents));
  const [cardPriceValue, setCardPriceValue] = useState(centsToInputValue(cardPriceCents));
  const [dealNoteValue, setDealNoteValue] = useState(dealNote ?? "");
  const [error, setError] = useState<string | null>(null);

  const hasPrice = cashPriceCents !== null || cardPriceCents !== null;

  function handleSave() {
    const cash = parsePriceInput(cashPriceValue);
    const card = parsePriceInput(cardPriceValue);
    if (cash === "invalid" || card === "invalid") {
      setError("Enter a price of 0 or more");
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
            dealNote: dealNoteValue.trim(),
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
      {hasPrice && (
        <p className="text-xs text-zinc-500 mb-1">
          {cashPriceCents !== null && <>Cash {formatPrice(cashPriceCents)} each</>}
          {cashPriceCents !== null && cardPriceCents !== null && " · "}
          {cardPriceCents !== null && <>Card {formatPrice(cardPriceCents)} each</>}
          {dealNote && <> · {dealNote}</>}
        </p>
      )}
      {!open ? (
        <button
          onClick={() => {
            setCashPriceValue(centsToInputValue(cashPriceCents));
            setCardPriceValue(centsToInputValue(cardPriceCents));
            setDealNoteValue(dealNote ?? "");
            setOpen(true);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {hasPrice ? "Edit category price & deal" : "Set one price for this whole category"}
        </button>
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
          <input
            type="text"
            placeholder="Deal note, e.g. 3 for $50"
            value={dealNoteValue}
            onChange={(e) => setDealNoteValue(e.target.value)}
            className="min-w-[140px] flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
          />
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
