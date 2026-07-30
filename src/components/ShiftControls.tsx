"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ShiftControls({
  hasActiveShift,
  startedAtLabel,
  revenueCents,
}: {
  hasActiveShift: boolean;
  startedAtLabel: string | null;
  revenueCents: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/shifts/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to start shift");
        return;
      }
      router.refresh();
    });
  }

  function handleEnd() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/shifts/close", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to end shift");
        return;
      }
      setConfirmingEnd(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-6">
      {hasActiveShift ? (
        <>
          <p className="text-sm text-zinc-500 mb-1">
            Shift active since <span className="font-medium">{startedAtLabel}</span>
          </p>
          {revenueCents !== null && (
            <p className="text-sm text-zinc-500 mb-3">
              Total sold: <span className="font-medium">${(revenueCents / 100).toFixed(2)}</span>
            </p>
          )}
          {!confirmingEnd ? (
            <button
              onClick={() => setConfirmingEnd(true)}
              className="text-sm text-red-600 hover:underline"
            >
              End shift
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                End shift and archive today&apos;s counts? Sold counts reset to 0 for the next shift.
              </span>
              <button
                onClick={handleEnd}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmingEnd(false)}
                className="text-sm text-zinc-500"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-3">
            No active shift. Start one to begin recording sales.
          </p>
          <button
            onClick={handleStart}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium px-4 py-2 text-sm disabled:opacity-50"
          >
            {isPending ? "Starting..." : "Start New Shift"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
