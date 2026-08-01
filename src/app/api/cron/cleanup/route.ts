import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Weekly report needs the last *completed* Monday-Sunday week intact no matter which day
// of the following week someone checks it — a plain rolling 7 days would start deleting
// the oldest day of that week mid-week. 14 days keeps it available with plenty of margin,
// matching the audit log's existing retention.
const RETENTION_DAYS = 14;
const AUDIT_LOG_RETENTION_DAYS = 14;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shiftCutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
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
