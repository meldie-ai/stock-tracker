import ProductRow from "@/components/ProductRow";
import CategoryPriceEditor from "@/components/CategoryPriceEditor";

type Product = {
  id: string;
  name: string;
  stockCount: number;
  cashPriceCents: number | null;
  cardPriceCents: number | null;
  dealNote: string | null;
};

export default function CategorySection({
  categoryId,
  categoryName,
  categoryCashPriceCents,
  categoryCardPriceCents,
  categoryDealNote,
  products,
  soldByProductId,
  hasActiveShift,
}: {
  categoryId: string;
  categoryName: string;
  categoryCashPriceCents: number | null;
  categoryCardPriceCents: number | null;
  categoryDealNote: string | null;
  products: Product[];
  soldByProductId: Map<string, number>;
  hasActiveShift: boolean;
}) {
  const hasCategoryPrice = categoryCashPriceCents !== null || categoryCardPriceCents !== null;

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
      />
      {products.length === 0 ? (
        <p className="text-sm text-zinc-400">No products yet.</p>
      ) : (
        products.map((product) => (
          <ProductRow
            key={product.id}
            productId={product.id}
            name={product.name}
            stockCount={product.stockCount}
            soldCount={soldByProductId.get(product.id) ?? null}
            hasActiveShift={hasActiveShift}
            cashPriceCents={product.cashPriceCents}
            cardPriceCents={product.cardPriceCents}
            dealNote={product.dealNote}
            showPriceEditor={!hasCategoryPrice}
          />
        ))
      )}
    </section>
  );
}
