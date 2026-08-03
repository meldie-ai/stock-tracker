"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout, describeFetchError } from "@/lib/fetchWithTimeout";

type ShiftNoteView = {
  id: string;
  text: string;
  usernameSnapshot: string;
  createdAtLabel: string;
};

export default function ShiftControls({
  hasActiveShift,
  startedAtLabel,
  startedByUsername,
  notes,
}: {
  hasActiveShift: boolean;
  startedAtLabel: string | null;
  startedByUsername: string | null;
  notes: ShiftNoteView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSubmitting, startNoteTransition] = useTransition();

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

  function handleAddNote() {
    if (!noteText.trim()) {
      setNoteError("Enter a note first");
      return;
    }
    setNoteError(null);
    startNoteTransition(async () => {
      try {
        const res = await fetchWithTimeout("/api/shifts/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: noteText }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setNoteError(data.error ?? "Failed to add note");
          return;
        }
        setNoteText("");
        router.refresh();
      } catch (err) {
        setNoteError(describeFetchError(err));
      }
    });
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-zinc-800 bg-white/55 dark:bg-zinc-950 backdrop-blur-xl backdrop-saturate-150 p-4 mb-6">
      {hasActiveShift ? (
        <>
          <p className="text-sm text-zinc-500 mb-3">
            Shift active since <span className="font-medium">{startedAtLabel}</span>
            {startedByUsername && (
              <>
                {" "}
                &middot; Started by <span className="font-medium">{startedByUsername}</span>
              </>
            )}
          </p>
          {!confirmingEnd ? (
            <button
              onClick={() => setConfirmingEnd(true)}
              className="rounded-full border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/40 px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/60"
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
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4 pt-3 border-t border-black/10 dark:border-zinc-900">
            <p className="text-xs font-medium text-zinc-500 mb-2">Notes</p>
            {notes.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {notes.map((note) => (
                  <div key={note.id} className="text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{note.text}</span>{" "}
                    <span className="text-xs text-zinc-400">
                      &mdash; {note.usernameSnapshot} · {note.createdAtLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note for this shift..."
                className="min-w-[160px] flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={noteSubmitting}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
              >
                Add note
              </button>
            </div>
            {noteError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{noteError}</p>}
          </div>
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
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </>
      )}
    </div>
  );
}
