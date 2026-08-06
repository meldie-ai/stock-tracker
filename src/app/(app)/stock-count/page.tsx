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
  // This page is a server-rendered snapshot, not a live view — it only reflects stock as
  // of whenever it was last loaded/refreshed. Stamp that moment so it's clear how current
  // the numbers actually are if the page has been sitting open a while.
  const generatedAt = new Date();

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
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-zinc-500">
                    Shift active since{" "}
                    <span className="font-medium">
                      {formatDateDDMMYY(activeShift.startedAt)} {formatTime12(activeShift.startedAt)}
                    </span>{" "}
                    ({dayPartLabel(activeShift.startedAt)}) &middot; Started by{" "}
                    <span className="font-medium">{activeShift.startedByUser.username}</span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Snapshot as of {formatDateDDMMYY(generatedAt)} {formatTime12(generatedAt)}
                  </p>
                </div>
                <CopyButton
                  text={buildCategoriesCopyText(
                    [
                      "Stock Count",
                      `Shift active since ${formatDateDDMMYY(activeShift.startedAt)} ${formatTime12(activeShift.startedAt)} (${dayPartLabel(activeShift.startedAt)})`,
                      `Started by ${activeShift.startedByUser.username}`,
                      `Snapshot as of ${formatDateDDMMYY(generatedAt)} ${formatTime12(generatedAt)}`,
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
