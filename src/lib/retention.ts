/**
 * How long Shift (and its ShiftSale/ShiftStockSnapshot children) and AuditLog rows are kept
 * before the nightly cron (src/app/api/cron/cleanup/route.ts) deletes them. History, the
 * audit log, and the sales report can never show data older than this — kept in one place
 * so the cron and every page that surfaces a "may be incomplete" note stay in sync.
 */
export const SHIFT_RETENTION_DAYS = 90;
export const AUDIT_LOG_RETENTION_DAYS = 90;

/** The oldest a Shift row (and its sales/stock snapshots) can be right now before it's purged. */
export function getShiftRetentionCutoff(): Date {
  return new Date(Date.now() - SHIFT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
