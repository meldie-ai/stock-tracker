import { categoriesForActiveShift, getActiveShift, getCategoriesWithProducts } from "@/lib/data";
import { formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import ShiftBreakdown from "@/components/ShiftBreakdown";

export default async function StockCountPage() {
  const [activeShift, categoriesWithProducts] = await Promise.all([
    getActiveShift(),
    getCategoriesWithProducts(),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Stock Count
      </h1>

      {!activeShift ? (
        <p className="text-sm text-zinc-500">
          No active shift. Start a shift on the Dashboard to see the live stock count here.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            Shift active since{" "}
            <span className="font-medium">
              {formatDateDDMMYY(activeShift.startedAt)} {formatTime12(activeShift.startedAt)}
            </span>
          </p>
          <ShiftBreakdown
            categories={categoriesForActiveShift(
              categoriesWithProducts,
              new Map(activeShift.sales.map((s) => [s.productId, s.soldCount])),
              "STOCK"
            )}
          />
        </>
      )}
    </div>
  );
}
