/** Shared by CategoryTabs (href) and CategorySection (id) so anchors can't drift out of sync. */
export function categoryAnchorId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
