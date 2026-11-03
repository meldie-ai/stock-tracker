-- Lets a product keep its own price/deal even while its category has a shared
-- price set, instead of the category price applying to every product with no
-- exceptions. Defaults to false, so existing category-priced products keep
-- using the category price exactly as before.
ALTER TABLE "Product" ADD COLUMN "overridesCategoryPrice" BOOLEAN NOT NULL DEFAULT false;
