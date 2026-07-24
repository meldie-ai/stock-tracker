import { getClosedShiftsWithinDays } from "@/lib/data";
import CopyTextButton from "@/components/CopyTextButton";

const HISTORY_RETENTION_DAYS = 7;

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
          <section
            key={shift.id}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-3"
          >
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {shift.dayLabel}
            </p>
            <p className="text-xs text-zinc-500 mb-3">
              {shift.dateRangeLabel} · {shift.timeRangeLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              <CopyTextButton
                label="Copy Products Sold List"
                fetchUrl={`/api/shifts/${shift.id}/text?kind=SOLD`}
              />
              <CopyTextButton
                label="Copy Stock Count List"
                fetchUrl={`/api/shifts/${shift.id}/text?kind=STOCK`}
                variant="secondary"
              />
            </div>
          </section>
        ))
      )}
    </div>
  );
}
