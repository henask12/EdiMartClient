"use client";

import { FormEvent, useEffect, useState } from "react";
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

  const load = async () => {
    const res = await fetch("/api/proxy/categories", { cache: "no-store" });
    if (res.ok) {
      setItems(dedupeCategories((await res.json()) as Category[]));
    }
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
    if (
      items.some((c) => c.id !== id && categoryNamesConflict(c.name, trimmed))
    ) {
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
    if (!confirm("Delete this category?")) {
      return;
    }
    const res = await fetch(`/api/proxy/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Could not delete");
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Categories</h1>
        <p className="mt-2 text-sm text-white/60">Organize products — Drinks, Snacks, etc.</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex gap-2 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-4"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <button
          type="submit"
          className="tap btn-primary px-4 py-2 text-sm"
        >
          Add
        </button>
      </form>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <ul className="space-y-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
          >
            {editingId === c.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
              />
            ) : (
              <div>
                <p className="font-medium text-white">{c.name}</p>
                <p className="text-xs text-white/45">{c._count.products} products</p>
              </div>
            )}
            <div className="flex gap-2">
              {editingId === c.id ? (
                <button
                  type="button"
                  onClick={() => handleUpdate(c.id)}
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  Save
                </button>
              ) : (
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
              )}
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="text-xs font-semibold text-rose-300"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
