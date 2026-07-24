"use client";

import { useState } from "react";

class ApiError extends Error {}

async function fetchListText(fetchUrl: string): Promise<string> {
  const res = await fetch(fetchUrl);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? "Failed to generate list");
  }
  return data.text as string;
}

export default function CopyTextButton({
  label,
  fetchUrl,
  variant = "primary",
}: {
  label: string;
  fetchUrl: string;
  variant?: "primary" | "secondary";
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        // Give ClipboardItem a pending Blob promise so navigator.clipboard.write()
        // itself is invoked synchronously within this click handler. Some
        // browsers (notably iOS Safari) reject a clipboard write if it happens
        // after an earlier `await` (e.g. a fetch) breaks the "direct user
        // gesture" requirement — this pattern keeps the write call itself
        // inside the gesture while the actual text resolves afterward.
        const blobPromise = fetchListText(fetchUrl).then(
          (text) => new Blob([text], { type: "text/plain" })
        );
        await navigator.clipboard.write([
          new ClipboardItem({ "text/plain": blobPromise }),
        ]);
      } else {
        const text = await fetchListText(fetchUrl);
        await navigator.clipboard.writeText(text);
      }
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "Couldn't copy — check clipboard permissions"
      );
      setStatus("error");
    }
  }

  const base =
    "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90"
      : "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className={`${base} ${styles}`}
      >
        {status === "loading" ? "Copying..." : status === "copied" ? "Copied!" : label}
      </button>
      {status === "error" && errorMessage && (
        <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
      )}
    </div>
  );
}
