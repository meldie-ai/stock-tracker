import type { ShiftTextCategory } from "@/lib/textTemplates";

function categoryLines(category: ShiftTextCategory): string[] {
  const lines = category.name.split("\n");
  if (category.products.length === 0) {
    lines.push("No products.");
    return lines;
  }
  category.products.forEach((product) => lines.push(`${product.name}: ${product.value}`));
  const total = category.products.reduce((sum, p) => sum + p.value, 0);
  lines.push(`Total: ${total}`);
  return lines;
}

function categoriesLines(categories: ShiftTextCategory[]): string[] {
  const lines: string[] = [];
  categories.forEach((category, index) => {
    lines.push(...categoryLines(category));
    if (index < categories.length - 1) lines.push("");
  });
  return lines;
}

/** Plain-text copy for a single breakdown (Stock Count or Products Sold, on its own page). */
export function buildCategoriesCopyText(headerLines: string[], categories: ShiftTextCategory[]): string {
  return [...headerLines, "", ...categoriesLines(categories)].join("\n");
}

/** Plain-text copy for a full shift report combining multiple labelled breakdowns (History detail). */
export function buildShiftReportCopyText(
  headerLines: string[],
  sections: { heading: string; categories: ShiftTextCategory[] }[]
): string {
  const lines: string[] = [...headerLines, ""];
  sections.forEach((section, index) => {
    lines.push(section.heading, "");
    lines.push(...categoriesLines(section.categories));
    if (index < sections.length - 1) lines.push("", "");
  });
  return lines.join("\n");
}
