"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. no secure context); nothing more to do.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-full border border-black/10 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-zinc-800"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
