import { getActiveShift, getCategoriesWithProducts } from "@/lib/data";
import { formatTime12, formatDateDDMMYY } from "@/lib/dateFormat";
import ShiftControls from "@/components/ShiftControls";
import CategorySection from "@/components/CategorySection";
import DashboardCategoryTabs from "@/components/DashboardCategoryTabs";

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

  return (
    <div>
      <ShiftControls hasActiveShift={!!activeShift} startedAtLabel={startedAtLabel} />

      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No categories yet. Head to Manage to add your first category and products.
        </p>
      ) : (
        <DashboardCategoryTabs
          tabs={categories.map((c) => ({ id: c.id, label: c.name.split("\n")[0] }))}
        >
          {categories.map((category) => (
            <CategorySection
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              categoryCashPriceCents={category.cashPriceCents}
              categoryCardPriceCents={category.cardPriceCents}
              categoryDealNote={category.dealNote}
              products={category.products}
              soldByProductId={soldByProductId}
              hasActiveShift={!!activeShift}
            />
          ))}
        </DashboardCategoryTabs>
      )}
    </div>
  );
}
