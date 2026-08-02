import CategoryPriceEditor from "@/components/CategoryPriceEditor";
import CategoryDealCart from "@/components/CategoryDealCart";

type Product = {
  id: string;
  name: string;
  stockCount: number;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
  dealQuantity: number | null;
  dealPriceCents: number | null;
};

export default function CategorySection({
  categoryId,
  categoryName,
  categoryCashPriceCents,
  categoryCardPriceCents,
  categoryDealNote,
  categoryDealQuantity,
  categoryDealPriceCents,
  products,
  soldByProductId,
  hasActiveShift,
}: {
  categoryId: string;
  categoryName: string;
  categoryCashPriceCents: number | null;
  categoryCardPriceCents: number | null;
  categoryDealNote: string | null;
  categoryDealQuantity: number | null;
  categoryDealPriceCents: number | null;
  products: Product[];
  soldByProductId: Map<string, number>;
  hasActiveShift: boolean;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-16">
      <h2 className="whitespace-pre-line text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50 mb-2">
        {categoryName}
      </h2>
      <CategoryPriceEditor
        categoryId={categoryId}
        cashPriceCents={categoryCashPriceCents}
        cardPriceCents={categoryCardPriceCents}
        dealNote={categoryDealNote}
        dealQuantity={categoryDealQuantity}
        dealPriceCents={categoryDealPriceCents}
      />
      <CategoryDealCart
        categoryCashPriceCents={categoryCashPriceCents}
        categoryCardPriceCents={categoryCardPriceCents}
        categoryDealQuantity={categoryDealQuantity}
        categoryDealPriceCents={categoryDealPriceCents}
        products={products}
        soldByProductId={soldByProductId}
        hasActiveShift={hasActiveShift}
      />
    </section>
  );
}
