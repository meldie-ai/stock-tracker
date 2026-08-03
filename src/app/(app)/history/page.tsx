import Link from "next/link";
import { getClosedShiftsWithinDays, getShiftsRevenueTotals } from "@/lib/data";
import { dayPartLabel, formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import { formatPrice } from "@/lib/price";
import { getCurrentUser } from "@/lib/session";
import { SHIFT_RETENTION_DAYS } from "@/lib/retention";

export default async function HistoryPage() {
  const [shifts, currentUser] = await Promise.all([
    getClosedShiftsWithinDays(SHIFT_RETENTION_DAYS),
    getCurrentUser(),
  ]);
  const isAdmin = currentUser?.role === "ADMIN";
  const revenueTotals = isAdmin
    ? await getShiftsRevenueTotals(shifts.map((s) => s.id))
    : null;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Shift History
      </h1>
      <p className="text-sm text-zinc-500 mb-4">
        Last {SHIFT_RETENTION_DAYS} days of closed shifts. Older shifts are automatically removed.
      </p>

      {shifts.length === 0 ? (
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
