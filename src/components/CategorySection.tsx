import ProductRow from "@/components/ProductRow";
import CategoryPriceEditor from "@/components/CategoryPriceEditor";
import { categoryAnchorId } from "@/lib/slug";

type Product = {
  id: string;
  name: string;
  stockCount: number;
  priceCents: number | null;
  dealNote: string | null;
};

export default function CategorySection({
  categoryId,
  categoryName,
  categoryPriceCents,
  categoryDealNote,
  products,
  soldByProductId,
  hasActiveShift,
}: {
  categoryId: string;
  categoryName: string;
  categoryPriceCents: number | null;
  categoryDealNote: string | null;
  products: Product[];
  soldByProductId: Map<string, number>;
  hasActiveShift: boolean;
}) {
  const hasCategoryPrice = categoryPriceCents !== null;

  return (
    <section
      id={categoryAnchorId(categoryName)}
      className="scroll-mt-28 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-16"
    >
      <h2 className="whitespace-pre-line text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50 mb-2">
        {categoryName}
      </h2>
      <CategoryPriceEditor
        categoryId={categoryId}
        priceCents={categoryPriceCents}
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
            priceCents={product.priceCents}
            dealNote={product.dealNote}
            showPriceEditor={!hasCategoryPrice}
          />
        ))
      )}
    </section>
  );
}
