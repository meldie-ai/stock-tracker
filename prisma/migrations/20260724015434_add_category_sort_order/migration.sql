-- AlterTable
ALTER TABLE "ShiftSale" ADD COLUMN     "categorySortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShiftStockSnapshot" ADD COLUMN     "categorySortOrder" INTEGER NOT NULL DEFAULT 0;
