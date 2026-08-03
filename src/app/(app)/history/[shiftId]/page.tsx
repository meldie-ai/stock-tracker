import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getShiftDeductions,
  getShiftDetail,
  getShiftPaymentBreakdown,
  getShiftRestockedSummary,
  getShiftRevenueSummary,
  groupByCategory,
  sumDuplicateProductRows,
} from "@/lib/data";
import { dayPartLabel, formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";
import { formatPrice } from "@/lib/price";
import { getCurrentUser } from "@/lib/session";
import { buildShiftReportCopyText } from "@/lib/shiftCopyText";
import ShiftBreakdown from "@/components/ShiftBreakdown";
import CopyButton from "@/components/CopyButton";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const [shift, currentUser] = await Promise.all([getShiftDetail(shiftId), getCurrentUser()]);
  if (!shift || shift.status !== "CLOSED" || !shift.endedAt) {
    notFound();
  }
  const isAdmin = currentUser?.role === "ADMIN";

  const soldCategories = groupByCategory(
    // A product can have separate cash/card rows for the same shift now — sum them back
    // into one line per product (but keep zero-sold products, unlike the summary reports).
    sumDuplicateProductRows(
      shift.sales.map((s) => ({
        categoryNameSnapshot: s.categoryNameSnapshot,
        productNameSnapshot: s.productNameSnapshot,
        value: s.soldCount,
      }))
    )
  );
  const stockCategories = groupByCategory(
    shift.stockSnapshots.map((s) => ({
      categoryNameSnapshot: s.categoryNameSnapshot,
      productNameSnapshot: s.productNameSnapshot,
      value: s.stockCountAtClose,
    }))
  );
  const restockedCategories = groupByCategory(await getShiftRestockedSummary(shift.id));
  const deductions = await getShiftDeductions(shift.id);

  const [revenue, paymentBreakdown] = isAdmin
    ? await Promise.all([getShiftRevenueSummary(shift.id), getShiftPaymentBreakdown(shift.id)])
    : [null, null];

  const dateRangeLabel = `${formatDateDDMMYY(shift.startedAt)} ${formatTime12(shift.startedAt)} – ${formatDateDDMMYY(shift.endedAt)} ${formatTime12(shift.endedAt)}`;
  const startDayPart = dayPartLabel(shift.startedAt);
  const endDayPart = dayPartLabel(shift.endedAt);
  const dayPartRangeLabel = startDayPart === endDayPart ? startDayPart : `${startDayPart} – ${endDayPart}`;

  return (
    <div>
      <Link
        href="/history"
        className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Shift History
      </Link>
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
              { heading: "Restocked", categories: restockedCategories },
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

      {isAdmin && revenue && (
        <>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Money made
          </h2>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-6">
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
        </>
      )}

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        Products Sold
      </h2>
      <div className={isAdmin ? "mb-3" : "mb-6"}>
        <ShiftBreakdown kind="SOLD" categories={soldCategories} />
      </div>
      {isAdmin && paymentBreakdown && paymentBreakdown.length > 0 && (
        <details className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400">
            See detailed breakdown
          </summary>
          <div className="mt-2 flex flex-col gap-2.5 text-sm">
            {paymentBreakdown.map((row) => (
              <div key={row.label}>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{row.label}</p>
                <p className="text-xs text-zinc-500">
                  Cash {row.cash} &middot; Card {row.card} &middot; Deal {row.deal}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Restocked</h2>
      <div className="mb-6">
        {restockedCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">No restocking recorded this shift.</p>
        ) : (
          <ShiftBreakdown kind="RESTOCKED" categories={restockedCategories} />
        )}
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Deducted</h2>
      {deductions.length === 0 ? (
        <p className="text-sm text-zinc-500 mb-6">No stock deductions this shift.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {deductions.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-red-600 dark:text-red-400">{d.productName}</span>
                <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  &minus;{d.quantity}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {d.reason} &middot; {d.usernameSnapshot} &middot; {formatDateDDMMYY(d.createdAt)}{" "}
                {formatTime12(d.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        Stock Count
      </h2>
      <div className="mb-6">
        <ShiftBreakdown kind="STOCK" categories={stockCategories} />
      </div>

      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Notes</h2>
      {shift.notes.length === 0 ? (
        <p className="text-sm text-zinc-500">No notes for this shift.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {shift.notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
            >
              <p className="text-zinc-900 dark:text-zinc-50">{note.text}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {note.usernameSnapshot} · {formatDateDDMMYY(note.createdAt)} {formatTime12(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
