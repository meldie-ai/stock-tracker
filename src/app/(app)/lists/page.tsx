import { getSessionUser } from "@/lib/session";
import { categoriesForActiveShift, getActiveShift, getCategoriesWithProducts } from "@/lib/data";
import { buildShiftText, capitalizeName } from "@/lib/textTemplates";
import CopyTextButton from "@/components/CopyTextButton";

export default async function ListsPage() {
  const [user, activeShift, categoriesWithProducts] = await Promise.all([
    getSessionUser(),
    getActiveShift(),
    getCategoriesWithProducts(),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Current lists
      </h1>
      <p className="text-sm text-zinc-500 mb-4">
        Live view of this shift&apos;s sold and stock lists, exactly as they&apos;ll be copied.
      </p>

      {!activeShift || !user ? (
        <p className="text-sm text-zinc-500">
          No active shift. Start a shift on the Dashboard to see live lists here.
        </p>
      ) : (
        (() => {
          const soldByProductId = new Map(
            activeShift.sales.map((s) => [s.productId, s.soldCount])
          );
          const soldText = buildShiftText({
            kind: "SOLD",
            startedAt: activeShift.startedAt,
            endedAt: null,
            categories: categoriesForActiveShift(categoriesWithProducts, soldByProductId, "SOLD"),
            signOffName: capitalizeName(user.username),
          });
          const stockText = buildShiftText({
            kind: "STOCK",
            startedAt: activeShift.startedAt,
            endedAt: null,
            categories: categoriesForActiveShift(
              categoriesWithProducts,
              soldByProductId,
              "STOCK"
            ),
            signOffName: capitalizeName(user.username),
          });

          return (
            <div className="flex flex-col gap-4">
              <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Products Sold
                  </h2>
                  <CopyTextButton
                    label="Copy"
                    fetchUrl="/api/shifts/active/text?kind=SOLD"
                    variant="secondary"
                  />
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm font-mono text-zinc-700 dark:text-zinc-300">
                  {soldText}
                </pre>
              </section>

              <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Stock Count
                  </h2>
                  <CopyTextButton
                    label="Copy"
                    fetchUrl="/api/shifts/active/text?kind=STOCK"
                    variant="secondary"
                  />
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm font-mono text-zinc-700 dark:text-zinc-300">
                  {stockText}
                </pre>
              </section>
            </div>
          );
        })()
      )}
    </div>
  );
}
