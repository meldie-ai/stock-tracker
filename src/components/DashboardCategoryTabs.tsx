"use client";

import { Children, useState } from "react";

export default function DashboardCategoryTabs({
  tabs,
  children,
}: {
  tabs: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? null);
  const sections = Children.toArray(children);

  if (tabs.length === 0) return null;

  return (
    <div>
      <nav className="sticky top-14 z-30 mb-4 flex gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-black/10 dark:border-zinc-800 bg-white/55 dark:bg-black/95 backdrop-blur-xl backdrop-saturate-150 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              activeId === tab.id
                ? "bg-blue-600 text-white dark:bg-transparent dark:text-zinc-50"
                : "text-zinc-500 hover:bg-black/5 dark:hover:bg-transparent dark:hover:text-zinc-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {tabs.map((tab, i) => (tab.id === activeId ? sections[i] : null))}
    </div>
  );
}
