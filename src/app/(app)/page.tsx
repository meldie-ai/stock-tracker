import { getActiveShift, getCategoriesWithProducts } from "@/lib/data";
import { formatTime12, formatDateDDMMYY } from "@/lib/dateFormat";
import ShiftControls from "@/components/ShiftControls";
import CategorySection from "@/components/CategorySection";
import CategoryTabs from "@/components/CategoryTabs";

export default async function DashboardPage() {
  const [categories, activeShift] = await Promise.all([
    getCategoriesWithProducts(),
    getActiveShift(),
  ]);

  const soldByProductId = new Map<string, number>();
  if (activeShift) {
    for (const sale of activeShift.sales) {
      if (sale.productId) soldByProductId.set(sale.productId, sale.soldCount);
    }
  }

  const startedAtLabel = activeShift
    ? `${formatDateDDMMYY(activeShift.startedAt)} ${formatTime12(activeShift.startedAt)}`
    : null;

  let revenueCents: number | null = null;
  if (activeShift) {
    revenueCents = 0;
    for (const category of categories) {
      for (const product of category.products) {
        const sold = soldByProductId.get(product.id) ?? 0;
        revenueCents += sold * (product.priceCents ?? 0);
      }
    }
  }

  return (
    <div>
      <ShiftControls
        hasActiveShift={!!activeShift}
        startedAtLabel={startedAtLabel}
        revenueCents={revenueCents}
      />
      <CategoryTabs categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No categories yet. Head to Manage to add your first category and products.
        </p>
      ) : (
        categories.map((category) => (
          <CategorySection
            key={category.id}
            categoryName={category.name}
            products={category.products}
            soldByProductId={soldByProductId}
            hasActiveShift={!!activeShift}
          />
        ))
      )}
    </div>
  );
}
