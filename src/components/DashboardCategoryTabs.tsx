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
      <nav className="sticky top-14 z-30 -mx-4 mb-4 flex overflow-x-auto whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-black/95 backdrop-blur px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            className={`mr-4 shrink-0 text-xs font-semibold uppercase tracking-wide ${
              activeId === tab.id
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
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
