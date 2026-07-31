-- AlterTable: split the single priceCents into cashPriceCents/cardPriceCents.
-- Backfill both new columns from the existing price so no data is lost,
-- then drop the old column.
ALTER TABLE "Category" ADD COLUMN "cashPriceCents" INTEGER;
ALTER TABLE "Category" ADD COLUMN "cardPriceCents" INTEGER;
UPDATE "Category" SET "cashPriceCents" = "priceCents", "cardPriceCents" = "priceCents" WHERE "priceCents" IS NOT NULL;
ALTER TABLE "Category" DROP COLUMN "priceCents";

ALTER TABLE "Product" ADD COLUMN "cashPriceCents" INTEGER;
ALTER TABLE "Product" ADD COLUMN "cardPriceCents" INTEGER;
UPDATE "Product" SET "cashPriceCents" = "priceCents", "cardPriceCents" = "priceCents" WHERE "priceCents" IS NOT NULL;
ALTER TABLE "Product" DROP COLUMN "priceCents";
