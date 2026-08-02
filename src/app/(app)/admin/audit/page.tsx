import { getAuditLog } from "@/lib/data";
import { formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import { AUDIT_LOG_RETENTION_DAYS } from "@/lib/retention";

export default async function AdminAuditPage() {
  const entries = await getAuditLog({});

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Audit log</h1>
      <p className="text-sm text-zinc-500 mb-4">
        Last {AUDIT_LOG_RETENTION_DAYS} days of stock changes. Older entries are automatically removed.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {entry.productNameSnapshot}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {formatDateDDMMYY(entry.createdAt)} {formatTime12(entry.createdAt)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {entry.action} by <span className="uppercase">{entry.usernameSnapshot}</span> · {entry.stockBefore} &rarr;{" "}
                {entry.stockAfter}
                {entry.note ? ` · ${entry.note}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
