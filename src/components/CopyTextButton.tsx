"use client";

import { useState } from "react";

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
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Failed to generate list");
        setStatus("error");
        return;
      }
      await navigator.clipboard.writeText(data.text);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setErrorMessage("Couldn't copy — check clipboard permissions");
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
