import Link from "next/link";
import { getActiveShift, getClosedShiftsWithinDays, getShiftsRevenueTotals } from "@/lib/data";
import { dayPartLabel, formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import { formatPrice } from "@/lib/price";
import { getCurrentUser } from "@/lib/session";
import { SHIFT_RETENTION_DAYS } from "@/lib/retention";

export default async function HistoryPage() {
  const [shifts, currentUser, activeShift] = await Promise.all([
    getClosedShiftsWithinDays(SHIFT_RETENTION_DAYS),
    getCurrentUser(),
    getActiveShift(),
  ]);
  const isAdmin = currentUser?.role === "ADMIN";
  const revenueTotals = isAdmin
    ? await getShiftsRevenueTotals([
        ...(activeShift ? [activeShift.id] : []),
        ...shifts.map((s) => s.id),
      ])
    : null;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Shift History
      </h1>
      <p className="text-sm text-zinc-500 mb-4">
        Last {SHIFT_RETENTION_DAYS} days of closed shifts. Older shifts are automatically removed.
      </p>

      {activeShift && (
        <Link
          href={`/history/${activeShift.id}`}
          className="flex touch-manipulation items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4 mb-3 active:bg-blue-100 dark:active:bg-blue-950/50 hover:border-blue-300 dark:hover:border-blue-800"
          aria-label={`View details for the shift in progress since ${formatDateDDMMYY(activeShift.startedAt)}`}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {formatDateDDMMYY(activeShift.startedAt)} {formatTime12(activeShift.startedAt)}
              {" – Ongoing"}
            </p>
            <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">
              {dayPartLabel(activeShift.startedAt)} – Ongoing
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              View sold &amp; stock breakdown
              {revenueTotals?.get(activeShift.id) && (
                <>
                  {" · "}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatPrice(revenueTotals.get(activeShift.id)!.totalRevenueCents)} made
                  </span>
                </>
              )}
            </p>
          </div>
          <span className="shrink-0 text-blue-300 dark:text-blue-700" aria-hidden="true">
            &rsaquo;
          </span>
        </Link>
      )}

      {shifts.length === 0 && !activeShift ? (
        <p className="text-sm text-zinc-500">No closed shifts yet.</p>
      ) : (
        shifts.map((shift) => {
          const revenue = revenueTotals?.get(shift.id);
          const startDayPart = dayPartLabel(shift.startedAt);
          const endDayPart = shift.endedAt ? dayPartLabel(shift.endedAt) : null;
          const dayPartRangeLabel =
            endDayPart && endDayPart !== startDayPart
              ? `${startDayPart} – ${endDayPart}`
              : startDayPart;
          return (
            <Link
              key={shift.id}
              href={`/history/${shift.id}`}
              className="flex touch-manipulation items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-3 active:bg-zinc-50 dark:active:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
              aria-label={`View details for shift on ${formatDateDDMMYY(shift.startedAt)}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {formatDateDDMMYY(shift.startedAt)} {formatTime12(shift.startedAt)}
                  {" – "}
                  {shift.endedAt &&
                    `${formatDateDDMMYY(shift.endedAt)} ${formatTime12(shift.endedAt)}`}
                </p>
                <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">
                  {dayPartRangeLabel}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  View sold &amp; stock breakdown
                  {revenue && (
                    <>
                      {" · "}
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatPrice(revenue.totalRevenueCents)} made
                      </span>
                    </>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                &rsaquo;
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}
