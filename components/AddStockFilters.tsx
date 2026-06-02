"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Filter, X } from "@/lib/icons";
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search name or SKU…"
          aria-label="Search products"
          containerClassName="flex-1"
        />
        <Button
          type="button"
          variant={open || hasActiveFilters ? "primary" : "secondary"}
          size="sm"
          icon={<Filter className="size-4" />}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0"
        >
          Filters{hasActiveFilters ? ` (${activeChips.length})` : ""}
        </Button>
      </div>

      {open ? (
        <div className="grid gap-3 rounded-[var(--radius-md)] border border-white/10 bg-[color:var(--surface)]/60 p-4 sm:grid-cols-2">
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
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-[var(--brand-yellow)]/30",
                "bg-[var(--brand-yellow)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)] focus-ring",
              )}
            >
              {chip.label}
              <X className="size-3 opacity-70" aria-hidden />
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
