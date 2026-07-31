import type { AuditAction, Prisma } from "@/generated/prisma/client";

export async function recordAuditEntry(
  tx: Prisma.TransactionClient,
  entry: {
    action: AuditAction;
    userId: string;
    usernameSnapshot: string;
    productId: string | null;
    productNameSnapshot: string;
    categoryNameSnapshot: string;
    quantityDelta: number;
    stockBefore: number;
    stockAfter: number;
    shiftId?: string | null;
    note?: string | null;
  }
): Promise<void> {
  await tx.auditLog.create({ data: entry });
}
