import { notFound } from "next/navigation";
import { getShiftDetail, groupByCategory } from "@/lib/data";
import { formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import ShiftBreakdown from "@/components/ShiftBreakdown";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const shift = await getShiftDetail(shiftId);
  if (!shift || shift.status !== "CLOSED" || !shift.endedAt) {
    notFound();
  }

  const soldCategories = groupByCategory(
    shift.sales.map((s) => ({
      categoryNameSnapshot: s.categoryNameSnapshot,
      productNameSnapshot: s.productNameSnapshot,
      value: s.soldCount,
    }))
  );
  const stockCategories = groupByCategory(
    shift.stockSnapshots.map((s) => ({
      categoryNameSnapshot: s.categoryNameSnapshot,
      productNameSnapshot: s.productNameSnapshot,
      value: s.stockCountAtClose,
    }))
  );

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Shift details
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        {formatDateDDMMYY(shift.startedAt)} {formatTime12(shift.startedAt)}
        {" – "}
        {formatDateDDMMYY(shift.endedAt)} {formatTime12(shift.endedAt)}
      </p>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        Products Sold
      </h2>
      <div className="mb-6">
        <ShiftBreakdown kind="SOLD" categories={soldCategories} />
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        Stock Count
      </h2>
      <ShiftBreakdown kind="STOCK" categories={stockCategories} />
    </div>
  );
}
