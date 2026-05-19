"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

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
      render: (t) => t._count.products,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (t) => (
        <div className="flex justify-end gap-2">
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

      <DataTable columns={columns} rows={items} rowKey={(t) => t.id} />
    </div>
  );
}
