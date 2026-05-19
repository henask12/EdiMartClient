"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryNamesConflict, dedupeCategories, normalizeCategoryName } from "@/lib/dedupe-categories";

export type CategoryOption = {
  id: string;
  name: string;
  _count?: { products: number };
};

type Props = {
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
  allowCreate?: boolean;
  compact?: boolean;
  required?: boolean;
};

export const CategorySelect = ({
  value,
  onChange,
  label = "Category",
  allowCreate = true,
  compact = false,
  required = true,
}: Props) => {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [filter, setFilter] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/proxy/categories", { cache: "no-store" });
    if (res.ok) {
      const raw = (await res.json()) as CategoryOption[];
      setCategories(dedupeCategories(raw));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return categories;
    }
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, filter]);

  const handleCreate = async () => {
    const trimmed = normalizeCategoryName(newName);
    if (!trimmed) {
      setError("Enter a category name");
      return;
    }
    if (categories.some((c) => categoryNamesConflict(c.name, trimmed))) {
      setError("That category already exists");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/proxy/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not create category");
      return;
    }
    const created = data as CategoryOption;
    await load();
    onChange(created.id);
    setNewName("");
    setFilter("");
  };

  const selectClass = compact
    ? "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm text-white"
    : "mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-white";

  return (
    <div className="space-y-2">
      <label className="block text-sm text-white/70">
        {label}
        <select
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
          aria-label={label}
        >
          <option value="">{required ? "Choose category…" : "No category"}</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c._count ? ` (${c._count.products})` : ""}
            </option>
          ))}
        </select>
      </label>

      {!compact ? (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter categories…"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        />
      ) : null}

      {allowCreate ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-xs text-white/60">
            New category
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              placeholder="Unique name"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCreate()}
            className="tap shrink-0 rounded-full border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-200">{error}</p> : null}

      {!compact ? (
        <Link href="/categories" className="text-xs text-[var(--accent-2)]">
          Manage all categories →
        </Link>
      ) : null}
    </div>
  );
};
