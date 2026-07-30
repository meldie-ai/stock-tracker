import type { ShiftTextCategory } from "@/lib/textTemplates";

export default function ShiftBreakdown({ categories }: { categories: ShiftTextCategory[] }) {
  if (categories.length === 0) {
    return <p className="text-sm text-zinc-500">No categories yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => {
        const total = category.products.reduce((sum, p) => sum + p.value, 0);
        return (
          <section
            key={category.name}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4"
          >
            <h3 className="whitespace-pre-line text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50 mb-2">
              {category.name}
            </h3>
            {category.products.length === 0 ? (
              <p className="text-sm text-zinc-400">No products.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {category.products.map((product) => (
                  <li
                    key={product.name}
                    className="flex items-center justify-between gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span>{product.name}</span>
                    <span className="font-medium tabular-nums">{product.value}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 text-xs font-semibold text-zinc-500">
              Total: {total}
            </p>
          </section>
        );
      })}
    </div>
  );
}
