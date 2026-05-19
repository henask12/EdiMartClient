"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CategoryProductsModal } from "@/components/CategoryProductsModal";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { categoryNamesConflict, dedupeCategories, normalizeCategoryName } from "@/lib/dedupe-categories";

type Category = {
  id: string;
  name: string;
  _count: { products: number };
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewCategory, setViewCategory] = useState<Category | null>(null);

  const total = items.length;
  const pagedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const load = async () => {
    const res = await fetch("/api/proxy/categories", { cache: "no-store" });
    if (res.ok) setItems(dedupeCategories((await res.json()) as Category[]));
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = normalizeCategoryName(name);
    if (items.some((c) => categoryNamesConflict(c.name, trimmed))) {
      setError("A category with this name already exists");
      return;
    }
    const res = await fetch("/api/proxy/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not create");
      return;
    }
    setName("");
    await load();
  };

  const handleUpdate = async (id: string) => {
    setError(null);
    const trimmed = normalizeCategoryName(editName);
    if (items.some((c) => c.id !== id && categoryNamesConflict(c.name, trimmed))) {
      setError("A category with this name already exists");
      return;
    }
    const res = await fetch(`/api/proxy/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) {
      setError("Could not update");
      return;
    }
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/proxy/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Could not delete");
      return;
    }
    await load();
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) =>
        editingId === c.id ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
          />
        ) : (
          <span className="font-medium text-white">{c.name}</span>
        ),
    },
    {
      key: "count",
      header: "Products",
      className: "tabular-nums",
      render: (c) => (
        <button
          type="button"
          onClick={() => setViewCategory(c)}
          className="tap text-[var(--accent-2)] underline-offset-2 hover:underline"
          disabled={c._count.products === 0}
        >
          {c._count.products}
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-2">
          {c._count.products > 0 ? (
            <button
              type="button"
              onClick={() => setViewCategory(c)}
              className="text-xs font-semibold text-[var(--accent-2)]"
            >
              View
            </button>
          ) : null}
          {editingId === c.id ? (
            <>
              <button
                type="button"
                onClick={() => void handleUpdate(c.id)}
                className="text-xs font-semibold text-[var(--accent)]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-xs text-white/50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingId(c.id);
                  setEditName(c.name);
                }}
                className="text-xs font-semibold text-white/70"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(c.id)}
                className="text-xs font-semibold text-rose-300"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Categories</h1>
        <p className="mt-2 text-sm text-white/60">Organize products — Drinks, Snacks, etc.</p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="flex gap-2 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-4"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <button type="submit" className="tap btn-primary px-4 py-2 text-sm">
          Add
        </button>
      </form>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable columns={columns} rows={pagedItems} rowKey={(c) => c.id} />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[10, 15, 25, 50]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <CategoryProductsModal
        title={viewCategory?.name ?? ""}
        filterParam="categoryId"
        filterId={viewCategory?.id ?? null}
        onClose={() => setViewCategory(null)}
      />
    </div>
  );
};
