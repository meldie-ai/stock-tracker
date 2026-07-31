-- AlterTable: add an explicit product-to-product link, replacing the
-- fragile name/category-string matching the carton auto-refill cascade
-- used to rely on.
ALTER TABLE "Product" ADD COLUMN "linkedCartonProductId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_linkedCartonProductId_fkey"
  FOREIGN KEY ("linkedCartonProductId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- One-time backfill: link every product whose category is (trimmed,
-- case-insensitive) "SINGLES" to the same-named product in a category
-- named "CARTONS", using the exact matching logic the old cascade used —
-- so existing pairs don't need to be manually re-linked. Going forward,
-- this string matching is never used again; the link is authoritative.
UPDATE "Product" AS singles
SET "linkedCartonProductId" = (
  SELECT cartons.id
  FROM "Product" AS cartons
  JOIN "Category" AS cartons_cat ON cartons_cat.id = cartons."categoryId"
  WHERE UPPER(TRIM(cartons_cat.name)) = 'CARTONS'
    AND UPPER(TRIM(cartons.name)) = UPPER(TRIM(singles.name))
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "Category" AS singles_cat
  WHERE singles_cat.id = singles."categoryId"
    AND UPPER(TRIM(singles_cat.name)) = 'SINGLES'
);
