export type ShiftTextProduct = { name: string; value: number };
export type ShiftTextCategory = {
  /** May contain a newline for a two-line bold header, e.g. "VAPES\nALIBARBAR". */
  name: string;
  products: ShiftTextProduct[];
};

/** e.g. "minsel" -> "Minsel" */
export function capitalizeName(username: string): string {
  return username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
