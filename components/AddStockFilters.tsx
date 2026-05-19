"use client";

import { useState } from "react";

type Category = { id: string; name: string };

const STOCK_OPTIONS = [
  { value: "", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low", label: "Low" },
  { value: "out", label: "OUT of Stock" },
] as const;

type Props = {
  q: string;
  onQChange: (value: string) => void;
  categories: Category[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  stockStatus: string;
  onStockStatusChange: (value: string) => void;
};

export const AddStockFilters = ({
  q,
  onQChange,
  categories,
  categoryId,
  onCategoryChange,
  stockStatus,
  onStockStatusChange,
}: Props) => {
  const [open, setOpen] = useState(false);

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    activeChips.push({ label: cat?.name ?? "Category", onClear: () => onCategoryChange("") });
  }
  if (stockStatus) {
    const s = STOCK_OPTIONS.find((o) => o.value === stockStatus);
    activeChips.push({ label: s?.label ?? stockStatus, onClear: () => onStockStatusChange("") });
  }

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search name or SKU…"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
          aria-label="Search products"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`tap shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold ${
            open || hasActiveFilters
              ? "border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)]/10 text-[var(--accent)]"
              : "border-white/15 bg-white/5 text-white/80"
          }`}
          aria-expanded={open}
        >
          Filters{hasActiveFilters ? ` (${activeChips.length})` : ""}
        </button>
      </div>

      {open ? (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-[color:var(--surface)]/60 p-4 sm:grid-cols-2">
          <label className="block text-xs text-white/60">
            Category
            <select
              value={categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/60">
            Stock
            <select
              value={stockStatus}
              onChange={(e) => onStockStatusChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {STOCK_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              className="tap inline-flex items-center gap-1 rounded-full border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)]"
            >
              {chip.label}
              <span aria-hidden className="text-white/50">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onCategoryChange("");
              onStockStatusChange("");
            }}
            className="text-xs text-white/50 underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
};
