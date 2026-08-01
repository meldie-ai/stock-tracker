import Link from "next/link";
import { getClosedShiftsWithinDays } from "@/lib/data";
import { formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";

const HISTORY_RETENTION_DAYS = 30; // matches the cron cleanup's shift retention

export default async function HistoryPage() {
  const shifts = await getClosedShiftsWithinDays(HISTORY_RETENTION_DAYS);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        Shift history
      </h1>
      <p className="text-sm text-zinc-500 mb-4">
        Last {HISTORY_RETENTION_DAYS} days of closed shifts. Older shifts are automatically removed.
      </p>

      {shifts.length === 0 ? (
        <p className="text-sm text-zinc-500">No closed shifts yet.</p>
      ) : (
        shifts.map((shift) => (
          <Link
            key={shift.id}
            href={`/history/${shift.id}`}
            className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-3 hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {formatDateDDMMYY(shift.startedAt)} {formatTime12(shift.startedAt)}
              {" – "}
              {shift.endedAt &&
                `${formatDateDDMMYY(shift.endedAt)} ${formatTime12(shift.endedAt)}`}
            </p>
            <p className="text-xs text-zinc-500">View sold &amp; stock breakdown</p>
          </Link>
        ))
      )}
    </div>
  );
}
