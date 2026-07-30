-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PRICE_CHANGE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dealNote" TEXT,
ADD COLUMN     "priceCents" INTEGER;
