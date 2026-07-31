import { categoriesForActiveShift, getActiveShift, getCategoriesWithProducts } from "@/lib/data";
import { formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import ShiftBreakdown from "@/components/ShiftBreakdown";

export default async function ProductsSoldPage() {
  const [activeShift, categoriesWithProducts] = await Promise.all([
    getActiveShift(),
    getCategoriesWithProducts(),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Products Sold
      </h1>

      {!activeShift ? (
        <p className="text-sm text-zinc-500">
          No active shift. Start a shift on the Dashboard to see live sold counts here.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            Shift active since{" "}
            <span className="font-medium">
              {formatDateDDMMYY(activeShift.startedAt)} {formatTime12(activeShift.startedAt)}
            </span>{" "}
            &middot; Started by <span className="font-medium">{activeShift.startedByUser.username}</span>
          </p>
          <ShiftBreakdown
            kind="SOLD"
            categories={categoriesForActiveShift(
              categoriesWithProducts,
              new Map(activeShift.sales.map((s) => [s.productId, s.soldCount])),
              "SOLD"
            )}
          />
        </>
      )}
    </div>
  );
}
