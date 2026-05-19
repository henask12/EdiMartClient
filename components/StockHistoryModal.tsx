"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { PageSizeSelect } from "@/components/PageSizeSelect";

type Movement = {
  id: string;
  type: string;
  qtyDelta: string;
  beforeOnHand: string | null;
  afterOnHand: string | null;
  createdAt: string;
  notes: string | null;
};

type Props = {
  productId: string | null;
  productName: string;
  onClose: () => void;
};

export const StockHistoryModal = ({ productId, productName, onClose }: Props) => {
  const [items, setItems] = useState<Movement[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    const params = new URLSearchParams({
      productId,
      take: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    const res = await fetch(`/api/proxy/stock/history?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: Movement[]; total: number };
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [productId, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!productId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-history-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[color:var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="stock-history-title" className="text-lg font-semibold text-white">
              Stock history
            </h2>
            <p className="mt-0.5 text-sm text-white/50">{productName}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-white/50">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">No movements yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/45">
                  <th className="pb-2 pr-2">Date</th>
                  <th className="pb-2 pr-2">Type</th>
                  <th className="pb-2 pr-2 text-right">Qty</th>
                  <th className="pb-2 text-right">On hand</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const qty = Number(m.qtyDelta);
                  return (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-2 pr-2 text-white/80">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2 text-white/70">{m.type}</td>
                      <td
                        className={`py-2 pr-2 text-right tabular-nums font-medium ${
                          qty < 0 ? "text-rose-200" : qty > 0 ? "text-emerald-200" : "text-white/60"
                        }`}
                      >
                        {qty > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
                      </td>
                      <td className="py-2 text-right tabular-nums text-white/60">
                        {m.beforeOnHand ?? "—"} → {m.afterOnHand ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PageSizeSelect
              value={pageSize}
              options={[10, 15, 25, 50]}
              onChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
};
