import {
  dayPartLabel,
  formatDateDDMMYY,
  formatHourCompact,
  formatTime12,
} from "@/lib/dateFormat";

export type ShiftTextProduct = { name: string; value: number };
export type ShiftTextCategory = {
  /** May contain a newline for a two-line bold header, e.g. "VAPES\nALIBARBAR". */
  name: string;
  products: ShiftTextProduct[];
};

export type ShiftTextInput = {
  kind: "SOLD" | "STOCK";
  startedAt: Date;
  /** null = shift still active; falls back to "now" for display only (nothing is persisted). */
  endedAt: Date | null;
  categories: ShiftTextCategory[];
  signOffName: string;
};

/** e.g. "minsel" -> "Minsel", used for the sign-off line. */
export function capitalizeName(username: string): string {
  return username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toTitleCase(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function categoryTotalLabel(categoryName: string): string {
  const firstLine = categoryName.split("\n")[0] ?? categoryName;
  return toTitleCase(firstLine);
}

function buildHeaderLines(
  kind: ShiftTextInput["kind"],
  startedAt: Date,
  endedAt: Date
): string[] {
  const listTitle = kind === "SOLD" ? "PRODUCTS SOLD LIST" : "STOCK COUNT LIST";
  const shortHint = `${formatHourCompact(startedAt)}-${formatHourCompact(endedAt)}`;
  const dayLabel = `${dayPartLabel(startedAt)} - ${dayPartLabel(endedAt)}`;
  const dateRange = `${formatDateDDMMYY(startedAt)} - ${formatDateDDMMYY(endedAt)}`;
  const timeRange = `${formatTime12(startedAt)}-${formatTime12(endedAt)}`;

  return [
    `*${listTitle} (${shortHint})*`,
    `*${dayLabel}*`,
    `*${dateRange}*`,
    `*${timeRange}*`,
  ];
}

function buildCategoryBlock(category: ShiftTextCategory): string[] {
  const lines: string[] = [];
  lines.push(`*${category.name}*`);
  category.products.forEach((product, index) => {
    lines.push(`${index + 1}. ${product.name} - ${product.value}`);
  });
  const total = category.products.reduce((sum, p) => sum + p.value, 0);
  lines.push("");
  lines.push(`*Total ${categoryTotalLabel(category.name)}: ${total}*`);
  return lines;
}

/**
 * Pure function: builds the exact WhatsApp-style copyable text block.
 * No DOM/React/DB dependency so it stays fully unit-testable.
 */
export function buildShiftText(input: ShiftTextInput): string {
  const endedAt = input.endedAt ?? new Date();
  const sections: string[] = [];

  sections.push(...buildHeaderLines(input.kind, input.startedAt, endedAt));
  sections.push("");

  input.categories.forEach((category, index) => {
    sections.push(...buildCategoryBlock(category));
    if (index < input.categories.length - 1) sections.push("");
  });

  sections.push("");
  sections.push(`*Kind regards & Signed By: ${input.signOffName}*`);

  return sections.join("\n");
}
