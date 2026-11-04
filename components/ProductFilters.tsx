"use client";

import { useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

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
  exportBasePath: string;
  exportParams: Record<string, string | undefined>;
};

export const ProductFilters = ({
  q,
  onQChange,
  categories,
  categoryId,
  onCategoryChange,
  stockStatus,
  onStockStatusChange,
  exportBasePath,
  exportParams,
}: Props) => {
  const [open, setOpen] = useState(false);

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    activeChips.push({
      label: cat?.name ?? "Category",
      onClear: () => onCategoryChange(""),
    });
  }
  if (stockStatus) {
    const s = STOCK_OPTIONS.find((o) => o.value === stockStatus);
    activeChips.push({
      label: s?.label ?? stockStatus,
      onClear: () => onStockStatusChange(""),
    });
  }

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search name or SKU…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text outline-none focus:border-primary"
          aria-label="Search products"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "tap rounded-xl border px-4 py-3 text-sm font-semibold",
              open || hasActiveFilters
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-surface-muted text-text-muted",
            )}
            aria-expanded={open}
          >
            Filters{hasActiveFilters ? ` (${activeChips.length})` : ""}
          </button>
          <ExportMenu basePath={exportBasePath} queryParams={exportParams} />
        </div>
      </div>

      {open ? (
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Stock"
            value={stockStatus}
            onChange={(e) => onStockStatusChange(e.target.value)}
          >
            {STOCK_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              className="tap inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
            >
              {chip.label}
              <span aria-hidden className="text-text-muted">
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
            className="text-xs text-text-muted underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
};
