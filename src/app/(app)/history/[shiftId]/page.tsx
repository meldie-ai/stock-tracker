import { notFound } from "next/navigation";
import { getShiftDetail, groupByCategory } from "@/lib/data";
import { dayPartLabel, formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import { buildShiftReportCopyText } from "@/lib/shiftCopyText";
import ShiftBreakdown from "@/components/ShiftBreakdown";
import CopyButton from "@/components/CopyButton";

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

  const dateRangeLabel = `${formatDateDDMMYY(shift.startedAt)} ${formatTime12(shift.startedAt)} – ${formatDateDDMMYY(shift.endedAt)} ${formatTime12(shift.endedAt)}`;
  const startDayPart = dayPartLabel(shift.startedAt);
  const endDayPart = dayPartLabel(shift.endedAt);
  const dayPartRangeLabel = startDayPart === endDayPart ? startDayPart : `${startDayPart} – ${endDayPart}`;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Shift details</h1>
        <CopyButton
          text={buildShiftReportCopyText(
            [
              "Shift Report",
              `${dateRangeLabel} (${dayPartRangeLabel})`,
              `Started by ${shift.startedByUser.username}`,
              ...(shift.endedByUser ? [`Ended by ${shift.endedByUser.username}`] : []),
            ],
            [
              { heading: "Products Sold", categories: soldCategories },
              { heading: "Stock Count", categories: stockCategories },
            ]
          )}
        />
      </div>
      <p className="text-sm text-zinc-500 mb-1">
        {dateRangeLabel} ({dayPartRangeLabel})
      </p>
      <p className="text-sm text-zinc-500 mb-6">
        Started by <span className="font-medium">{shift.startedByUser.username}</span>
        {shift.endedByUser && (
          <>
            {" "}
            &middot; Ended by <span className="font-medium">{shift.endedByUser.username}</span>
          </>
        )}
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
