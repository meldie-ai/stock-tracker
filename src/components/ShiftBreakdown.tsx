import type { ShiftTextCategory } from "@/lib/textTemplates";

const LOW_STOCK_THRESHOLD = 3; // matches ProductRow's low-stock cutoff

function valueColorClass(value: number, kind: "SOLD" | "STOCK") {
  if (kind === "STOCK") {
    if (value === 0) return "text-zinc-500 dark:text-zinc-500";
    if (value <= LOW_STOCK_THRESHOLD) return "text-amber-500 dark:text-amber-300";
    return "text-green-700 dark:text-green-400";
  }
  return value === 0 ? "text-zinc-400 dark:text-zinc-600" : "text-blue-700 dark:text-blue-400";
}

export default function ShiftBreakdown({
  categories,
  kind,
}: {
  categories: ShiftTextCategory[];
  kind: "SOLD" | "STOCK";
}) {
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
                    <span className={`font-semibold tabular-nums ${valueColorClass(product.value, kind)}`}>
                      {product.value}
                    </span>
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
