"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 25;

type Movement = {
  id: string;
  type: string;
  qtyDelta: string;
  beforeOnHand: string | null;
  afterOnHand: string | null;
  createdAt: string;
  notes: string | null;
  stockBatch: { expiryDate: string | null } | null;
  inventoryItem: {
    product: { id: string; name: string; category: { name: string } };
  };
};

type Product = { id: string; name: string };

export default function StockHistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      take: String(PAGE_SIZE),
      skip: String((page - 1) * PAGE_SIZE),
    });
    if (productId) {
      params.set("productId", productId);
    }
    const res = await fetch(`/api/proxy/stock/history?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: Movement[]; total: number };
      setMovements(data.items);
      setTotal(data.total);
    }
  }, [productId, page]);

  useEffect(() => {
    const loadProducts = async () => {
      const res = await fetch("/api/proxy/products?take=200", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items: Product[] };
        setProducts(data.items);
      }
    };
    void loadProducts();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Stock history</h1>
        <p className="mt-2 text-sm text-white/60">
          Full ledger — receipts, sales, reserves, adjustments.
        </p>
      </div>

      <label className="block max-w-md text-sm text-white/70">
        Filter by product
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
          className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <ul className="space-y-2">
        {movements.map((m) => {
          const before = m.beforeOnHand ?? "—";
          const after = m.afterOnHand ?? "—";
          const positive = Number(m.qtyDelta) >= 0;
          return (
            <li
              key={m.id}
              className="rounded-xl border border-white/10 bg-[color:var(--surface)]/70 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {m.inventoryItem.product.name}
                    <span className="ml-2 text-xs font-normal text-white/45">
                      {m.inventoryItem.product.category.name}
                    </span>
                  </p>
                  <p className="text-xs text-white/50">
                    {new Date(m.createdAt).toLocaleString()} · {m.type}
                  </p>
                </div>
                <span
                  className={`tabular-nums font-semibold ${
                    positive ? "text-[var(--accent)]" : "text-rose-300"
                  }`}
                >
                  {positive ? "+" : ""}
                  {m.qtyDelta}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/45">
                On hand: {before} → {after}
                {m.stockBatch?.expiryDate
                  ? ` · expires ${m.stockBatch.expiryDate.slice(0, 10)}`
                  : ""}
                {m.notes ? ` · ${m.notes}` : ""}
              </p>
            </li>
          );
        })}
        {movements.length === 0 ? (
          <li className="text-center text-sm text-white/50">No movements yet.</li>
        ) : null}
      </ul>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
