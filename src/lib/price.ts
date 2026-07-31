export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function centsToInputValue(cents: number | null): string {
  return cents !== null ? (cents / 100).toFixed(2) : "";
}

/** Empty string -> null (unset). Otherwise a valid non-negative dollar amount -> cents, or "invalid". */
export function parsePriceInput(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return "invalid";
  return Math.round(dollars * 100);
}
