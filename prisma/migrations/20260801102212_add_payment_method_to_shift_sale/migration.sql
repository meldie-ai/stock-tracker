-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- AlterTable: nullable so existing rows (recorded before payment-method tracking) stay valid
ALTER TABLE "ShiftSale" ADD COLUMN "paymentMethod" "PaymentMethod";

-- DropIndex
DROP INDEX "ShiftSale_shiftId_productId_key";

-- CreateIndex: a product can now have up to one row per payment method per shift
CREATE UNIQUE INDEX "ShiftSale_shiftId_productId_paymentMethod_key" ON "ShiftSale"("shiftId", "productId", "paymentMethod");
