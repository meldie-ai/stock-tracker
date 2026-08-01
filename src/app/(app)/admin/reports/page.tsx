import {
  getRestockedSummary,
  getRevenueSummary,
  getSoldSummary,
  getWeeklyReportDateRange,
  groupByCategory,
} from "@/lib/data";
import {
  formatDateDDMMYY,
  formatDateInputValue,
  parseShopLocalDateInput,
  shopLocalStartOfNextDay,
} from "@/lib/dateFormat";
import { formatPrice } from "@/lib/price";
import { SHIFT_RETENTION_DAYS, getShiftRetentionCutoff } from "@/lib/retention";
import { buildShiftReportCopyText } from "@/lib/shiftCopyText";
import ShiftBreakdown from "@/components/ShiftBreakdown";
import CopyButton from "@/components/CopyButton";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const parsedFrom = params.from ? parseShopLocalDateInput(params.from) : null;
  const parsedTo = params.to ? parseShopLocalDateInput(params.to) : null;

  let since: Date;
  let until: Date; // exclusive
  if (parsedFrom && parsedTo) {
    // Forgiving of the two dates being picked in the "wrong" order.
    const [earlier, later] = parsedFrom <= parsedTo ? [parsedFrom, parsedTo] : [parsedTo, parsedFrom];
    since = earlier;
    until = shopLocalStartOfNextDay(later);
  } else {
    ({ since, until } = getWeeklyReportDateRange());
  }

  const [soldRows, restockedRows, revenue] = await Promise.all([
    getSoldSummary(since, until),
    getRestockedSummary(since, until),
    getRevenueSummary(since, until),
  ]);

  const soldCategories = groupByCategory(soldRows);
  const restockedCategories = groupByCategory(restockedRows);
  const totalSold = soldRows.reduce((sum, r) => sum + r.value, 0);
  const totalRestocked = restockedRows.reduce((sum, r) => sum + r.value, 0);

  // `until` is exclusive (start of the day after the range) — step back 1ms to land on the
  // actual last included day for display.
  const displayUntil = new Date(until.getTime() - 1);
  const rangeLabel = `${formatDateDDMMYY(since)} – ${formatDateDDMMYY(displayUntil)}`;

  const retentionCutoff = getShiftRetentionCutoff();
  const mayBeIncomplete = since < retentionCutoff;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sales report</h1>
        <CopyButton
          text={buildShiftReportCopyText(
            [
              `Sales Report (${rangeLabel})`,
              `Money made — Cash: ${formatPrice(revenue.cashRevenueCents)} · Card: ${formatPrice(revenue.cardRevenueCents)} · Total: ${formatPrice(revenue.totalRevenueCents)}`,
            ],
            [
              { heading: `Sold (${totalSold} total)`, categories: soldCategories },
              { heading: `Restocked (${totalRestocked} total)`, categories: restockedCategories },
            ]
          )}
        />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 mt-3 mb-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          From
          <input
            type="date"
            name="from"
            defaultValue={formatDateInputValue(since)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          To
          <input
            type="date"
            name="to"
            defaultValue={formatDateInputValue(displayUntil)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
        >
          View
        </button>
      </form>

      <p className="text-sm text-zinc-500 mb-2">
        Showing {rangeLabel}. Only products with activity are listed.
      </p>
      {mayBeIncomplete && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
          Data is only kept for {SHIFT_RETENTION_DAYS} days — results before{" "}
          {formatDateDDMMYY(retentionCutoff)} may be incomplete or missing.
        </p>
      )}

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2 mt-4">Money made</h2>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-8">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <p>
            Cash:{" "}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatPrice(revenue.cashRevenueCents)}
            </span>
          </p>
          <p>
            Card:{" "}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatPrice(revenue.cardRevenueCents)}
            </span>
          </p>
          <p>
            Total:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatPrice(revenue.totalRevenueCents)}
            </span>
          </p>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Sold</h2>
      <p className="text-xs text-zinc-500 mb-3">{totalSold} units sold in this range</p>
      <div className="mb-8">
        {soldCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing sold in this range.</p>
        ) : (
          <ShiftBreakdown kind="SOLD" categories={soldCategories} />
        )}
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Restocked</h2>
      <p className="text-xs text-zinc-500 mb-3">{totalRestocked} units added in this range</p>
      {restockedCategories.length === 0 ? (
        <p className="text-sm text-zinc-500">No restocking recorded in this range.</p>
      ) : (
        <ShiftBreakdown kind="SOLD" categories={restockedCategories} />
      )}
    </div>
  );
}
