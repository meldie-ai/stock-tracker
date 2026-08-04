import {
  getClosedShiftsWithinDays,
  getRestockedSummary,
  getRevenueSummary,
  getRevenueSummaryForTimeRange,
  getShiftDetail,
  getShiftRestockedSummary,
  getShiftRevenueSummary,
  getSoldSummary,
  getSoldSummaryForTimeRange,
  getWeeklyReportDateRange,
  groupByCategory,
  sumDuplicateProductRows,
} from "@/lib/data";
import {
  dayPartLabel,
  formatDateDDMMYY,
  formatDateInputValue,
  formatTime12,
  parseShopLocalDateInput,
  parseShopLocalDateTimeInput,
  shopLocalStartOfNextDay,
} from "@/lib/dateFormat";
import { formatPrice } from "@/lib/price";
import { SHIFT_RETENTION_DAYS, getShiftRetentionCutoff } from "@/lib/retention";
import { buildShiftReportCopyText } from "@/lib/shiftCopyText";
import type { ShiftTextCategory } from "@/lib/textTemplates";
import ShiftBreakdown from "@/components/ShiftBreakdown";
import CopyButton from "@/components/CopyButton";
import TabSwitcher from "@/components/TabSwitcher";

/** Copy-text sections for a Restocked breakdown split by admin/staff/unknown, dropping empty groups. */
function restockedCopySections(
  adminCategories: ShiftTextCategory[],
  staffCategories: ShiftTextCategory[],
  unknownCategories: ShiftTextCategory[],
  totals: { admin: number; staff: number; unknown: number }
): { heading: string; categories: ShiftTextCategory[] }[] {
  return [
    { heading: `Restocked by Admin (${totals.admin} total)`, categories: adminCategories },
    { heading: `Restocked by Staff (${totals.staff} total)`, categories: staffCategories },
    ...(unknownCategories.length > 0
      ? [{ heading: `Restocked by Deleted Account (${totals.unknown} total)`, categories: unknownCategories }]
      : []),
  ];
}

/** Renders the Restocked section split into By Admin / By Staff / By Deleted Account groups. */
function restockedBreakdown({
  adminCategories,
  staffCategories,
  unknownCategories,
  totals,
  contextLabel,
}: {
  adminCategories: ShiftTextCategory[];
  staffCategories: ShiftTextCategory[];
  unknownCategories: ShiftTextCategory[];
  totals: { admin: number; staff: number; unknown: number };
  contextLabel: string;
}) {
  return (
    <>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Restocked</h2>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mt-3 mb-1">By Admin</h3>
      <p className="text-xs text-zinc-500 mb-3">{totals.admin} units added {contextLabel}</p>
      <div className="mb-4">
        {adminCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">No restocking by an admin {contextLabel}.</p>
        ) : (
          <ShiftBreakdown kind="RESTOCKED" categories={adminCategories} />
        )}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">By Staff</h3>
      <p className="text-xs text-zinc-500 mb-3">{totals.staff} units added {contextLabel}</p>
      <div className={unknownCategories.length > 0 ? "mb-4" : "mb-8"}>
        {staffCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">No restocking by staff {contextLabel}.</p>
        ) : (
          <ShiftBreakdown kind="RESTOCKED" categories={staffCategories} />
        )}
      </div>

      {unknownCategories.length > 0 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
            By Deleted Account
          </h3>
          <p className="text-xs text-zinc-500 mb-3">{totals.unknown} units added {contextLabel}</p>
          <div className="mb-8">
            <ShiftBreakdown kind="RESTOCKED" categories={unknownCategories} />
          </div>
        </>
      )}
    </>
  );
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; shift?: string; fromTime?: string; toTime?: string }>;
}) {
  const params = await searchParams;
  const shifts = await getClosedShiftsWithinDays(SHIFT_RETENTION_DAYS);

  const selectedShift = params.shift
    ? await getShiftDetail(params.shift)
    : null;

  if (selectedShift && selectedShift.status === "CLOSED" && selectedShift.endedAt) {
    const soldCategories = groupByCategory(
      sumDuplicateProductRows(
        selectedShift.sales.map((s) => ({
          categoryNameSnapshot: s.categoryNameSnapshot,
          productNameSnapshot: s.productNameSnapshot,
          value: s.soldCount,
        }))
      )
    );
    const restocked = await getShiftRestockedSummary(selectedShift.id);
    const restockedAdminCategories = groupByCategory(restocked.admin);
    const restockedStaffCategories = groupByCategory(restocked.staff);
    const restockedUnknownCategories = groupByCategory(restocked.unknown);
    const restockedTotals = {
      admin: restocked.admin.reduce((sum, r) => sum + r.value, 0),
      staff: restocked.staff.reduce((sum, r) => sum + r.value, 0),
      unknown: restocked.unknown.reduce((sum, r) => sum + r.value, 0),
    };
    const revenue = await getShiftRevenueSummary(selectedShift.id);
    const totalSold = soldCategories.reduce((sum, c) => sum + c.products.reduce((s, p) => s + p.value, 0), 0);

    const dateRangeLabel = `${formatDateDDMMYY(selectedShift.startedAt)} ${formatTime12(selectedShift.startedAt)} – ${formatDateDDMMYY(selectedShift.endedAt)} ${formatTime12(selectedShift.endedAt)}`;
    const startDayPart = dayPartLabel(selectedShift.startedAt);
    const endDayPart = dayPartLabel(selectedShift.endedAt);
    const dayPartRangeLabel = startDayPart === endDayPart ? startDayPart : `${startDayPart} – ${endDayPart}`;

    return (
      <div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sales report</h1>
          <CopyButton
            text={buildShiftReportCopyText(
              [
                "Sales Report",
                `${dateRangeLabel} (${dayPartRangeLabel})`,
                `Started by ${selectedShift.startedByUser.username}`,
                ...(selectedShift.endedByUser ? [`Ended by ${selectedShift.endedByUser.username}`] : []),
                `Money made — Cash: ${formatPrice(revenue.cashRevenueCents)} · Card: ${formatPrice(revenue.cardRevenueCents)} · Total: ${formatPrice(revenue.totalRevenueCents)}`,
              ],
              [
                { heading: `Sold (${totalSold} total)`, categories: soldCategories },
                ...restockedCopySections(
                  restockedAdminCategories,
                  restockedStaffCategories,
                  restockedUnknownCategories,
                  restockedTotals
                ),
              ]
            )}
          />
        </div>

        {reportFilters(params, shifts)}

        <p className="text-sm text-zinc-500 mb-6">
          {dateRangeLabel} ({dayPartRangeLabel}) · Started by{" "}
          <span className="font-medium">{selectedShift.startedByUser.username}</span>
          {selectedShift.endedByUser && (
            <>
              {" "}
              &middot; Ended by <span className="font-medium">{selectedShift.endedByUser.username}</span>
            </>
          )}
        </p>

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
        <p className="text-xs text-zinc-500 mb-3">{totalSold} units sold in this shift</p>
        <div className="mb-8">
          {soldCategories.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing sold this shift.</p>
          ) : (
            <ShiftBreakdown kind="SOLD" categories={soldCategories} />
          )}
        </div>

        {restockedBreakdown({
          adminCategories: restockedAdminCategories,
          staffCategories: restockedStaffCategories,
          unknownCategories: restockedUnknownCategories,
          totals: restockedTotals,
          contextLabel: "this shift",
        })}
      </div>
    );
  }

  const parsedFromTime = params.fromTime ? parseShopLocalDateTimeInput(params.fromTime) : null;
  const parsedToTime = params.toTime ? parseShopLocalDateTimeInput(params.toTime) : null;

  if (parsedFromTime && parsedToTime) {
    // Forgiving of the two instants being picked in the "wrong" order.
    const [since, until] =
      parsedFromTime <= parsedToTime ? [parsedFromTime, parsedToTime] : [parsedToTime, parsedFromTime];

    const [soldRows, restocked, revenue] = await Promise.all([
      getSoldSummaryForTimeRange(since, until),
      getRestockedSummary(since, until),
      getRevenueSummaryForTimeRange(since, until),
    ]);

    const soldCategories = groupByCategory(soldRows);
    const restockedAdminCategories = groupByCategory(restocked.admin);
    const restockedStaffCategories = groupByCategory(restocked.staff);
    const restockedUnknownCategories = groupByCategory(restocked.unknown);
    const restockedTotals = {
      admin: restocked.admin.reduce((sum, r) => sum + r.value, 0),
      staff: restocked.staff.reduce((sum, r) => sum + r.value, 0),
      unknown: restocked.unknown.reduce((sum, r) => sum + r.value, 0),
    };
    const totalSold = soldRows.reduce((sum, r) => sum + r.value, 0);

    const rangeLabel = `${formatDateDDMMYY(since)} ${formatTime12(since)} – ${formatDateDDMMYY(until)} ${formatTime12(until)}`;
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
                ...restockedCopySections(
                  restockedAdminCategories,
                  restockedStaffCategories,
                  restockedUnknownCategories,
                  restockedTotals
                ),
              ]
            )}
          />
        </div>

        {reportFilters(params, shifts)}

        <p className="text-sm text-zinc-500 mb-2">
          Showing exactly {rangeLabel}. Only products with activity are listed.
        </p>
        <p className="text-xs text-zinc-500 mb-2">
          Money made here is recalculated from current prices, not locked in at sale time —
          it may drift slightly if a price has changed since, and deal sales aren&apos;t
          included in it (their units still count under Sold).
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

        {restockedBreakdown({
          adminCategories: restockedAdminCategories,
          staffCategories: restockedStaffCategories,
          unknownCategories: restockedUnknownCategories,
          totals: restockedTotals,
          contextLabel: "in this range",
        })}
      </div>
    );
  }

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

  const [soldRows, restocked, revenue] = await Promise.all([
    getSoldSummary(since, until),
    getRestockedSummary(since, until),
    getRevenueSummary(since, until),
  ]);

  const soldCategories = groupByCategory(soldRows);
  const restockedAdminCategories = groupByCategory(restocked.admin);
  const restockedStaffCategories = groupByCategory(restocked.staff);
  const restockedUnknownCategories = groupByCategory(restocked.unknown);
  const restockedTotals = {
    admin: restocked.admin.reduce((sum, r) => sum + r.value, 0),
    staff: restocked.staff.reduce((sum, r) => sum + r.value, 0),
    unknown: restocked.unknown.reduce((sum, r) => sum + r.value, 0),
  };
  const totalSold = soldRows.reduce((sum, r) => sum + r.value, 0);

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
              ...restockedCopySections(
                restockedAdminCategories,
                restockedStaffCategories,
                restockedUnknownCategories,
                restockedTotals
              ),
            ]
          )}
        />
      </div>

      {reportFilters(params, shifts, formatDateInputValue(since), formatDateInputValue(displayUntil))}

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

      {restockedBreakdown({
        adminCategories: restockedAdminCategories,
        staffCategories: restockedStaffCategories,
        unknownCategories: restockedUnknownCategories,
        totals: restockedTotals,
        contextLabel: "in this range",
      })}
    </div>
  );
}

function reportFilters(
  params: { from?: string; to?: string; shift?: string; fromTime?: string; toTime?: string },
  shifts: { id: string; startedAt: Date; endedAt: Date | null }[],
  fromValue?: string,
  toValue?: string
) {
  const activeTab = params.shift ? "shift" : params.fromTime && params.toTime ? "time" : "date";

  return (
    <div className="mt-3 mb-4">
      <TabSwitcher
        pillStyle
        defaultTabId={activeTab}
        tabs={[
          { id: "date", label: "Date range" },
          { id: "time", label: "Time range" },
          { id: "shift", label: "Shift" },
        ]}
      >
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            From
            <input
              type="date"
              name="from"
              defaultValue={fromValue}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            To
            <input
              type="date"
              name="to"
              defaultValue={toValue}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
          >
            View range
          </button>
        </form>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            From
            <input
              type="datetime-local"
              name="fromTime"
              defaultValue={params.fromTime}
              className="w-[11.5rem] rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            To
            <input
              type="datetime-local"
              name="toTime"
              defaultValue={params.toTime}
              className="w-[11.5rem] rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
          >
            View time range
          </button>
        </form>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Shift
            <select
              name="shift"
              defaultValue={params.shift ?? ""}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm max-w-[16rem]"
            >
              <option value="">Select a shift&hellip;</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {formatDateDDMMYY(shift.startedAt)} {formatTime12(shift.startedAt)}
                  {shift.endedAt ? ` – ${formatTime12(shift.endedAt)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
          >
            View shift
          </button>
        </form>
      </TabSwitcher>
    </div>
  );
}
