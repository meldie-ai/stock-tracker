import { getCategoriesWithProducts } from "@/lib/data";
import ManageClient from "@/components/ManageClient";

export default async function ManagePage() {
  const categories = await getCategoriesWithProducts();

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
        Manage categories &amp; products
      </h1>
      <ManageClient categories={categories} />
    </div>
  );
}
