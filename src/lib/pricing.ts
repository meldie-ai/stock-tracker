// Category-overrides-product precedence, shared by anything that needs to know what
// a product actually costs: when a category has its own price/deal set, every
// product in it uses that instead of its individual price/deal (not a per-field
// fallback — an all-or-nothing switch per category).

type PriceFields = { cashPriceCents: number | null; cardPriceCents: number | null };
type DealFields = { dealQuantity: number | null; dealPriceCents: number | null };

export function hasCategoryPrice(category: PriceFields): boolean {
  return category.cashPriceCents !== null || category.cardPriceCents !== null;
}

export function resolveUnitPriceCents(
  product: PriceFields,
  category: PriceFields,
  paymentMethod: "CASH" | "CARD"
): number | null {
  const categoryPriced = hasCategoryPrice(category);
  const cashPriceCents = categoryPriced ? category.cashPriceCents : product.cashPriceCents;
  const cardPriceCents = categoryPriced ? category.cardPriceCents : product.cardPriceCents;
  return paymentMethod === "CASH" ? cashPriceCents : cardPriceCents;
}

export function resolveEffectiveDeal(
  product: PriceFields & DealFields,
  category: PriceFields & DealFields
): { dealQuantity: number; dealPriceCents: number } | null {
  const source = hasCategoryPrice(category) ? category : product;
  if (source.dealQuantity === null || source.dealPriceCents === null) return null;
  return { dealQuantity: source.dealQuantity, dealPriceCents: source.dealPriceCents };
}
