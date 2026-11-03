-- Reverts the per-product category-price override: category pricing is back to
-- a plain all-or-nothing switch per category, no per-product exceptions.
ALTER TABLE "Product" DROP COLUMN "overridesCategoryPrice";
