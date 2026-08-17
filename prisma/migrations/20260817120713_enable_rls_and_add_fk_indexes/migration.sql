-- Add indexes on foreign-key columns that didn't have one (Supabase Advisor:
-- "Unindexed foreign keys"). Speeds up joins/lookups through these relations
-- (e.g. shift history, undo-last-sale, carton/singles linking) as data grows.
CREATE INDEX "LoginAttempt_userId_idx" ON "LoginAttempt"("userId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_linkedCartonProductId_idx" ON "Product"("linkedCartonProductId");
CREATE INDEX "Shift_startedByUserId_idx" ON "Shift"("startedByUserId");
CREATE INDEX "Shift_endedByUserId_idx" ON "Shift"("endedByUserId");
CREATE INDEX "ShiftSale_productId_idx" ON "ShiftSale"("productId");
CREATE INDEX "ShiftStockSnapshot_productId_idx" ON "ShiftStockSnapshot"("productId");
CREATE INDEX "ShiftNote_userId_idx" ON "ShiftNote"("userId");

-- Enable Row Level Security (Supabase Advisor: "RLS Disabled in Public").
--
-- This app never uses Supabase's public PostgREST API (no supabase-js, no
-- anon/authenticated key) - the Next.js server talks to Postgres directly
-- via Prisma, connected as the table-owning role. Postgres table owners
-- always bypass RLS, so this has zero effect on the app's own queries.
-- It only closes off the anon/authenticated REST API path (unused here)
-- from being able to read/write these tables directly.
--
-- No policies are added, so with RLS enabled every role other than the
-- table owner is denied by default.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftSale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftStockSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftNote" ENABLE ROW LEVEL SECURITY;
