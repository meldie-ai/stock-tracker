import {
  getWeeklyReportDateRange,
  getWeeklyRestockedSummary,
  getWeeklySoldSummary,
  groupByCategory,
} from "@/lib/data";
import { formatDateDDMMYY } from "@/lib/dateFormat";
import { buildShiftReportCopyText } from "@/lib/shiftCopyText";
import ShiftBreakdown from "@/components/ShiftBreakdown";
import CopyButton from "@/components/CopyButton";

export default async function WeeklyReportPage() {
  const [soldRows, restockedRows] = await Promise.all([
    getWeeklySoldSummary(),
    getWeeklyRestockedSummary(),
  ]);

  const soldCategories = groupByCategory(soldRows);
  const restockedCategories = groupByCategory(restockedRows);
  const totalSold = soldRows.reduce((sum, r) => sum + r.value, 0);
  const totalRestocked = restockedRows.reduce((sum, r) => sum + r.value, 0);

  const { since, until } = getWeeklyReportDateRange();
  // `until` is the exclusive upper bound (this week's Monday) — step back 1ms to land on
  // the actual last day covered (last Sunday) for display.
  const displayUntil = new Date(until.getTime() - 1);
  const rangeLabel = `${formatDateDDMMYY(since)} – ${formatDateDDMMYY(displayUntil)}`;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Weekly report</h1>
        <CopyButton
          text={buildShiftReportCopyText(
            [`Weekly Report (${rangeLabel})`],
            [
              { heading: `Sold (${totalSold} total)`, categories: soldCategories },
              { heading: `Restocked (${totalRestocked} total)`, categories: restockedCategories },
            ]
          )}
        />
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        Last completed week: Monday {rangeLabel}. Only products with activity are listed.
      </p>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Sold</h2>
      <p className="text-xs text-zinc-500 mb-3">{totalSold} units sold that week</p>
      <div className="mb-8">
        {soldCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing sold that week.</p>
        ) : (
          <ShiftBreakdown kind="SOLD" categories={soldCategories} />
        )}
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Restocked</h2>
      <p className="text-xs text-zinc-500 mb-3">{totalRestocked} units added that week</p>
      {restockedCategories.length === 0 ? (
        <p className="text-sm text-zinc-500">No restocking recorded that week.</p>
      ) : (
        <ShiftBreakdown kind="SOLD" categories={restockedCategories} />
      )}
    </div>
  );
}
