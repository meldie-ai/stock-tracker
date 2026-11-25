-- Lets a sale/adjustment and any cascade entries it triggered on a linked
-- carton be reversed together by Undo, instead of only the product acted on.
ALTER TABLE "AuditLog" ADD COLUMN "groupId" TEXT;
CREATE INDEX "AuditLog_groupId_idx" ON "AuditLog"("groupId");
