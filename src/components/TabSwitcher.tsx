"use client";

import { Children, useState } from "react";

export default function TabSwitcher({
  tabs,
  defaultTabId,
  pillStyle = false,
  children,
}: {
  tabs: { id: string; label: string }[];
  defaultTabId?: string | null;
  /** Compact, non-sticky pill tabs — used outside the Dashboard's own category switcher. */
  pillStyle?: boolean;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id ?? null);
  const sections = Children.toArray(children);

  if (tabs.length === 0) return null;

  return (
    <div>
      <nav
        className={
          pillStyle
            ? "mb-3 flex w-fit gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1"
            : "sticky top-14 z-30 mb-4 flex gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-black/10 dark:border-zinc-800 bg-white/55 dark:bg-black/95 backdrop-blur-xl backdrop-saturate-150 p-2"
        }
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            className={
              pillStyle
                ? `rounded-full px-3 py-1.5 text-xs font-semibold ${
                    activeId === tab.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`
                : `shrink-0 rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                    activeId === tab.id
                      ? "bg-blue-600 text-white dark:bg-transparent dark:text-zinc-50"
                      : "text-zinc-500 hover:bg-black/5 dark:hover:bg-transparent dark:hover:text-zinc-50"
                  }`
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {tabs.map((tab, i) => (tab.id === activeId ? sections[i] : null))}
    </div>
  );
}
