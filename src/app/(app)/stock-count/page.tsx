import {
  categoriesForActiveShift,
  getActiveShift,
  getCategoriesWithProducts,
  sumSoldByProductId,
} from "@/lib/data";
import { dayPartLabel, formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import { buildCategoriesCopyText } from "@/lib/shiftCopyText";
import ShiftBreakdown from "@/components/ShiftBreakdown";
import CopyButton from "@/components/CopyButton";

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
        (() => {
          const categories = categoriesForActiveShift(
            categoriesWithProducts,
            sumSoldByProductId(activeShift.sales),
            "STOCK"
          );
          return (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm text-zinc-500">
                  Shift active since{" "}
                  <span className="font-medium">
                    {formatDateDDMMYY(activeShift.startedAt)} {formatTime12(activeShift.startedAt)}
                  </span>{" "}
                  ({dayPartLabel(activeShift.startedAt)}) &middot; Started by{" "}
                  <span className="font-medium uppercase">{activeShift.startedByUser.username}</span>
                </p>
                <CopyButton
                  text={buildCategoriesCopyText(
                    [
                      "Stock Count",
                      `Shift active since ${formatDateDDMMYY(activeShift.startedAt)} ${formatTime12(activeShift.startedAt)} (${dayPartLabel(activeShift.startedAt)})`,
                      `Started by ${activeShift.startedByUser.username.toUpperCase()}`,
                    ],
                    categories
                  )}
                />
              </div>
              <ShiftBreakdown kind="STOCK" categories={categories} />
            </>
          );
        })()
      )}
    </div>
  );
}
