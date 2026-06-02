"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiveStockModal, type ReceiveStockProduct } from "@/components/ReceiveStockModal";

type ProductOption = {
  id: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  onHand: string;
  sku?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const ReceiveStockPickerModal = ({ open, onClose, onSuccess }: Props) => {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ReceiveStockProduct | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const search = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({ take: "20", skip: "0" });
    if (debouncedQ) params.set("q", debouncedQ);
    const res = await fetch(`/api/proxy/products?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: ProductOption[] };
      setItems(data.items);
    }
    setLoading(false);
  }, [debouncedQ, open]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setDebouncedQ("");
      setItems([]);
      setSelected(null);
      return;
    }
    void search();
  }, [open, search]);

  if (!open && !selected) return null;

  if (selected) {
    return (
      <ReceiveStockModal
        product={selected}
        onClose={() => {
          setSelected(null);
          onClose();
        }}
        onSuccess={() => {
          setSelected(null);
          onSuccess();
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="receive-picker-title" className="text-lg font-semibold text-white">
                Add stock
              </h2>
              <p className="mt-0.5 text-sm text-white/50">Search and select a product</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white/70"
              aria-label="Close"
            >
              Close
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or SKU…"
            className="mt-4 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--accent)]"
            autoFocus
          />
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <li className="py-8 text-center text-sm text-white/50">Searching…</li>
          ) : items.length === 0 ? (
            <li className="py-8 text-center text-sm text-white/50">No products found.</li>
          ) : (
            items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelected({
                      id: p.id,
                      name: p.name,
                      costPrice: p.costPrice,
                      sellingPrice: p.sellingPrice,
                      onHand: p.onHand,
                    })
                  }
                  className="tap w-full rounded-xl px-3 py-3 text-left hover:bg-white/5"
                >
                  <p className="font-medium text-white">{p.name}</p>
                  {p.sku ? <p className="text-xs text-white/45">SKU {p.sku}</p> : null}
                  <p className="mt-0.5 text-xs text-white/50 tabular-nums">
                    On hand {p.onHand}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
