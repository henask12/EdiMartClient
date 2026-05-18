"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 15;

type SaleLine = {
  id: string;
  quantity: string;
  lineTotal: string;
  product: { name: string };
};

type Sale = {
  id: string;
  saleNumber: string;
  grandTotal: string;
  createdAt: string;
  lines: SaleLine[];
  createdBy: { displayName: string | null; email: string };
};

export default function SalesPage() {
  const [items, setItems] = useState<Sale[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(PAGE_SIZE),
        skip: String((page - 1) * PAGE_SIZE),
      });
      if (from) {
        params.set("from", from);
      }
      if (to) {
        params.set("to", to);
      }
      const res = await fetch(`/api/proxy/sales?${params}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load sales");
      }
      const data = (await res.json()) as { items: Sale[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [from, to, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sales history</h1>
        <p className="mt-2 text-sm text-white/60">Past receipts and totals.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-4">
        <label className="text-sm text-white/70">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-white/70">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="btn-primary px-5 py-2 text-sm"
        >
          Apply filter
        </button>
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <ul className="space-y-3">
        {items.map((sale) => (
          <li
            key={sale.id}
            className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{sale.saleNumber}</p>
                <p className="text-xs text-white/50">
                  {new Date(sale.createdAt).toLocaleString()} ·{" "}
                  {sale.createdBy.displayName ?? sale.createdBy.email}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                {sale.grandTotal}
              </p>
            </div>
            <ul className="mt-3 space-y-1 border-t border-white/5 pt-3 text-sm text-white/75">
              {sale.lines.map((line) => (
                <li key={line.id} className="flex justify-between">
                  <span>
                    {line.product.name} × {line.quantity}
                  </span>
                  <span className="tabular-nums">{line.lineTotal}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {items.length === 0 && !error ? (
          <li className="text-center text-sm text-white/50">No sales yet.</li>
        ) : null}
      </ul>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
