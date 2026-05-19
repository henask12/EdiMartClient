"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CategoryProductsModal } from "@/components/CategoryProductsModal";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";

type ProductType = {
  id: string;
  name: string;
  _count: { products: number };
};

export default function ProductTypesPage() {
  const [items, setItems] = useState<ProductType[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewType, setViewType] = useState<ProductType | null>(null);

  const total = items.length;
  const pagedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const load = async () => {
    const res = await fetch("/api/proxy/product-types", { cache: "no-store" });
    if (res.ok) setItems((await res.json()) as ProductType[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/proxy/product-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
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
    const res = await fetch(`/api/proxy/product-types/${id}`, {
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
    if (!confirm("Delete this type?")) return;
    const res = await fetch(`/api/proxy/product-types/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Could not delete");
      return;
    }
    await load();
  };

  const columns: DataTableColumn<ProductType>[] = [
    {
      key: "name",
      header: "Name",
      render: (t) =>
        editingId === t.id ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
          />
        ) : (
          <span className="font-medium text-white">{t.name}</span>
        ),
    },
    {
      key: "count",
      header: "Products",
      className: "tabular-nums",
      render: (t) => (
        <button
          type="button"
          onClick={() => setViewType(t)}
          className="tap text-[var(--accent-2)] underline-offset-2 hover:underline"
          disabled={t._count.products === 0}
        >
          {t._count.products}
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (t) => (
        <div className="flex justify-end gap-2">
          {t._count.products > 0 ? (
            <button
              type="button"
              onClick={() => setViewType(t)}
              className="text-xs font-semibold text-[var(--accent-2)]"
            >
              View
            </button>
          ) : null}
          {editingId === t.id ? (
            <>
              <button
                type="button"
                onClick={() => void handleUpdate(t.id)}
                className="text-xs font-semibold text-[var(--accent)]"
              >
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="text-xs text-white/50">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingId(t.id);
                  setEditName(t.name);
                }}
                className="text-xs font-semibold text-[var(--accent-2)]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(t.id)}
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
        <Link href="/categories" className="text-sm text-[var(--accent-2)]">
          Categories
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Product types</h1>
        <p className="mt-2 text-sm text-white/60">Food, Beverage, Merchandise, etc.</p>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} className="flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New type name"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Add
        </button>
      </form>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable columns={columns} rows={pagedItems} rowKey={(t) => t.id} />

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
        title={viewType?.name ?? ""}
        filterParam="productTypeId"
        filterId={viewType?.id ?? null}
        onClose={() => setViewType(null)}
      />
    </div>
  );
};
