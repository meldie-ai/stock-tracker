import ProductRow from "@/components/ProductRow";
import { categoryAnchorId } from "@/lib/slug";

type Product = {
  id: string;
  name: string;
  stockCount: number;
};

export default function CategorySection({
  categoryName,
  products,
  soldByProductId,
  hasActiveShift,
}: {
  categoryName: string;
  products: Product[];
  soldByProductId: Map<string, number>;
  hasActiveShift: boolean;
}) {
  return (
    <section
      id={categoryAnchorId(categoryName)}
      className="scroll-mt-28 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-6"
    >
      <h2 className="whitespace-pre-line text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50 mb-2">
        {categoryName}
      </h2>
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
          />
        ))
      )}
    </section>
  );
}
