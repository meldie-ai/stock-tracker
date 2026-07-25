"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; stockCount: number; categoryId: string };
type Category = { id: string; name: string; products: Product[] };

export default function ManageClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newProductByCategory, setNewProductByCategory] = useState<
    Record<string, { name: string; stock: string }>
  >({});

  function run(action: () => Promise<Response>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  function addCategory() {
    if (!newCategoryName.trim()) return;
    run(() =>
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
    );
    setNewCategoryName("");
  }

  function renameCategory(id: string, name: string) {
    if (!name.trim()) return;
    run(() =>
      fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
    );
  }

  function deleteCategory(id: string) {
    if (!confirm("Delete this category? It must have no products left in it.")) return;
    run(() => fetch(`/api/categories/${id}`, { method: "DELETE" }));
  }

  function addProduct(categoryId: string) {
    const draft = newProductByCategory[categoryId];
    if (!draft?.name.trim()) return;
    const stockCount = draft.stock.trim() === "" ? 0 : Number(draft.stock);
    run(() =>
      fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, name: draft.name.trim(), stockCount }),
      })
    );
    setNewProductByCategory((prev) => ({ ...prev, [categoryId]: { name: "", stock: "" } }));
  }

  function renameProduct(id: string, name: string) {
    if (!name.trim()) return;
    run(() =>
      fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
    );
  }

  function moveProduct(id: string, categoryId: string) {
    run(() =>
      fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      })
    );
  }

  function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    run(() => fetch(`/api/products/${id}`, { method: "DELETE" }));
  }

  return (
    <div>
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">Add category</h2>
        <div className="flex gap-2">
          <textarea
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={"e.g. CARTONS or\nVAPES\nALIBARBAR"}
            rows={1}
            className="flex-1 min-w-0 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm resize-y"
          />
          <button
            onClick={addCategory}
            disabled={isPending}
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50 self-start"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Tip: use two lines for a two-line bold header like the VAPES/ALIBARBAR example.
        </p>
      </section>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {categories.map((category) => (
        <section
          key={category.id}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-4"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <textarea
              defaultValue={category.name}
              rows={category.name.split("\n").length}
              onBlur={(e) => {
                if (e.target.value !== category.name) renameCategory(category.id, e.target.value);
              }}
              className="flex-1 min-w-0 rounded-md border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent px-2 py-1 text-sm font-bold uppercase tracking-wide resize-y"
            />
            <button
              onClick={() => deleteCategory(category.id)}
              className="text-xs text-red-500 hover:underline shrink-0"
            >
              Delete category
            </button>
          </div>

          {category.products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-1.5 py-2 border-t border-zinc-100 dark:border-zinc-900 first:border-0"
            >
              <input
                defaultValue={product.name}
                onBlur={(e) => {
                  if (e.target.value !== product.name) renameProduct(product.id, e.target.value);
                }}
                className="w-full rounded-md border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent px-2 py-1 text-sm"
              />
              <div className="flex items-center gap-2 px-2">
                <select
                  defaultValue={product.categoryId}
                  onChange={(e) => moveProduct(product.id, e.target.value)}
                  className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-1 py-1 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.split("\n")[0]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="ml-auto text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <input
              placeholder="New product name"
              value={newProductByCategory[category.id]?.name ?? ""}
              onChange={(e) =>
                setNewProductByCategory((prev) => ({
                  ...prev,
                  [category.id]: { name: e.target.value, stock: prev[category.id]?.stock ?? "" },
                }))
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                placeholder="Stock"
                type="number"
                min={0}
                value={newProductByCategory[category.id]?.stock ?? ""}
                onChange={(e) =>
                  setNewProductByCategory((prev) => ({
                    ...prev,
                    [category.id]: { name: prev[category.id]?.name ?? "", stock: e.target.value },
                  }))
                }
                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
              />
              <button
                onClick={() => addProduct(category.id)}
                disabled={isPending}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
              >
                Add product
              </button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
