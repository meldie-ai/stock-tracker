-- AlterTable: structured cash-only "N for $X" deal fields, alongside the existing
-- free-text dealNote (unchanged) on both Category and Product.
ALTER TABLE "Category" ADD COLUMN "dealQuantity" INTEGER;
ALTER TABLE "Category" ADD COLUMN "dealPriceCents" INTEGER;
ALTER TABLE "Product" ADD COLUMN "dealQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN "dealPriceCents" INTEGER;

-- AlterTable: amount actually charged, locked in at sale time.
ALTER TABLE "ShiftSale" ADD COLUMN "revenueCentsCollected" INTEGER NOT NULL DEFAULT 0;

-- Best-effort backfill: every real dealNote observed follows "N for $X" (e.g.
-- "3 for $40 (CASH ONLY!)", "2 for $100 (CASH ONLY!)"). Parse that pattern to
-- populate the new structured columns automatically, so existing deals work
-- immediately without being re-entered. dealNote itself is left untouched.
-- Anything that doesn't match the pattern is simply left null.
UPDATE "Category"
SET "dealQuantity" = (regexp_match("dealNote", '(\d+)\s+for\s+\$?(\d+(?:\.\d{1,2})?)', 'i'))[1]::int,
    "dealPriceCents" = ROUND((regexp_match("dealNote", '(\d+)\s+for\s+\$?(\d+(?:\.\d{1,2})?)', 'i'))[2]::numeric * 100)::int
WHERE "dealNote" ~* '\d+\s+for\s+\$?\d+(\.\d{1,2})?';

UPDATE "Product"
SET "dealQuantity" = (regexp_match("dealNote", '(\d+)\s+for\s+\$?(\d+(?:\.\d{1,2})?)', 'i'))[1]::int,
    "dealPriceCents" = ROUND((regexp_match("dealNote", '(\d+)\s+for\s+\$?(\d+(?:\.\d{1,2})?)', 'i'))[2]::numeric * 100)::int
WHERE "dealNote" ~* '\d+\s+for\s+\$?\d+(\.\d{1,2})?';
