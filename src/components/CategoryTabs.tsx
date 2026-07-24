import { categoryAnchorId } from "@/lib/slug";

export default function CategoryTabs({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  if (categories.length === 0) return null;

  return (
    <nav className="sticky top-14 z-30 -mx-4 mb-4 overflow-x-auto whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-black/95 backdrop-blur px-4 py-2">
      {categories.map((c) => (
        <a
          key={c.id}
          href={`#${categoryAnchorId(c.name)}`}
          className="mr-4 inline-block text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          {c.name.split("\n")[0]}
        </a>
      ))}
    </nav>
  );
}
