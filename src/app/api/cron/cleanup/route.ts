import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SHIFT_RETENTION_DAYS, AUDIT_LOG_RETENTION_DAYS } from "@/lib/retention";

// Product/Category (the live stock catalog) are never touched here — only Shift and
// AuditLog rows expire. History, the audit log, and the sales report are kept for a
// month; anything older is removed automatically so storage doesn't grow unbounded.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shiftCutoff = new Date(Date.now() - SHIFT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [shiftResult, auditResult] = await Promise.all([
    prisma.shift.deleteMany({ where: { status: "CLOSED", endedAt: { lt: shiftCutoff } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
  ]);

  return NextResponse.json({
    deletedShifts: shiftResult.count,
    deletedAuditLogEntries: auditResult.count,
  });
}
