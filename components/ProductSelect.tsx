"use client";

import { useEffect, useMemo, useState } from "react";

export type ProductOption = {
  id: string;
  name: string;
  sellingPrice: string;
  onHand?: string;
  available?: string;
  inventoryItems?: { quantityOnHand: string }[];
};

type Props = {
  value: string;
  onChange: (productId: string) => void;
  label?: string;
};

export const ProductSelect = ({
  value,
  onChange,
  label = "Product",
}: Props) => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/proxy/products?take=200", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: ProductOption[] };
      setProducts(data.items);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, filter]);

  const selected = products.find((p) => p.id === value);

  return (
    <div className="space-y-2">
      <label className="block text-sm text-text-muted">
        {label}
        <input
          type="search"
          placeholder="Type to find product…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-text outline-none focus:border-primary"
        />
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tap w-full rounded-xl border border-border bg-surface-muted px-3 py-3 text-text outline-none focus:border-primary"
        aria-label={label}
      >
        <option value="">Choose a product…</option>
        {filtered.map((p) => {
          const avail =
            p.available ?? p.inventoryItems?.[0]?.quantityOnHand ?? "0";
          return (
            <option key={p.id} value={p.id}>
              {p.name} (available: {avail})
            </option>
          );
        })}
      </select>
      {selected ? (
        <p className="text-xs text-text-muted">
          Price: {selected.sellingPrice} · Available:{" "}
          {selected.available ??
            selected.inventoryItems?.[0]?.quantityOnHand ??
            "0"}
        </p>
      ) : null}
    </div>
  );
};
