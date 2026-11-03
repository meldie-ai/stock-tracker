// Category-overrides-product precedence, shared by anything that needs to know what
// a product actually costs: when a category has its own price/deal set, every
// product in it uses that instead of its individual price/deal (not a per-field
// fallback — an all-or-nothing switch per category) — UNLESS the product has
// explicitly opted out via overridesCategoryPrice, in which case that one
// product uses its own price/deal instead, regardless of the category's.

type PriceFields = { cashPriceCents: number | null; cardPriceCents: number | null };
type DealFields = { dealQuantity: number | null; dealPriceCents: number | null };
type OverrideFields = { overridesCategoryPrice: boolean };

export function hasCategoryPrice(category: PriceFields): boolean {
  return category.cashPriceCents !== null || category.cardPriceCents !== null;
}

/** Whether a product currently charges the category's shared price (vs. its own). */
export function usesCategoryPrice(product: OverrideFields, category: PriceFields): boolean {
  return hasCategoryPrice(category) && !product.overridesCategoryPrice;
}

export function resolveUnitPriceCents(
  product: PriceFields & OverrideFields,
  category: PriceFields,
  paymentMethod: "CASH" | "CARD"
): number | null {
  const categoryPriced = usesCategoryPrice(product, category);
  const cashPriceCents = categoryPriced ? category.cashPriceCents : product.cashPriceCents;
  const cardPriceCents = categoryPriced ? category.cardPriceCents : product.cardPriceCents;
  return paymentMethod === "CASH" ? cashPriceCents : cardPriceCents;
}

export function resolveEffectiveDeal(
  product: PriceFields & DealFields & OverrideFields,
  category: PriceFields & DealFields
): { dealQuantity: number; dealPriceCents: number } | null {
  const source = usesCategoryPrice(product, category) ? category : product;
  if (source.dealQuantity === null || source.dealPriceCents === null) return null;
  return { dealQuantity: source.dealQuantity, dealPriceCents: source.dealPriceCents };
}
