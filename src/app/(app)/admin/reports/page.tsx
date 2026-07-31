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
  const rangeLabel = `${formatDateDDMMYY(since)} – ${formatDateDDMMYY(until)}`;

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
        Last 7 days ({rangeLabel}). Only products with activity are listed.
      </p>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Sold</h2>
      <p className="text-xs text-zinc-500 mb-3">{totalSold} units sold this week</p>
      <div className="mb-8">
        {soldCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing sold in the last 7 days.</p>
        ) : (
          <ShiftBreakdown kind="SOLD" categories={soldCategories} />
        )}
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Restocked</h2>
      <p className="text-xs text-zinc-500 mb-3">{totalRestocked} units added this week</p>
      {restockedCategories.length === 0 ? (
        <p className="text-sm text-zinc-500">No restocking recorded in the last 7 days.</p>
      ) : (
        <ShiftBreakdown kind="SOLD" categories={restockedCategories} />
      )}
    </div>
  );
}
