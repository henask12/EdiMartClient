"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { PageSizeSelect } from "@/components/PageSizeSelect";

type ProductRow = {
  id: string;
  name: string;
  onHand: string;
  available: string;
  isActive?: boolean;
};

type Props = {
  title: string;
  filterParam: "categoryId" | "productTypeId";
  filterId: string | null;
  onClose: () => void;
};

export const CategoryProductsModal = ({ title, filterParam, filterId, onClose }: Props) => {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!filterId) return;
    setLoading(true);
    const params = new URLSearchParams({
      [filterParam]: filterId,
      take: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    const res = await fetch(`/api/proxy/products?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: ProductRow[]; total: number };
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [filterId, filterParam, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!filterId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-products-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="category-products-title" className="text-lg font-semibold text-text">
              Products
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1 text-sm text-text-muted"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No products.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="pb-2 pr-2">Name</th>
                  <th className="pb-2 pr-2 text-right">On hand</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const available = Number(p.available);
                  const status =
                    p.isActive === false
                      ? "Inactive"
                      : available <= 0
                        ? "Out"
                        : "Active";
                  return (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-2 text-text">{p.name}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-text-muted">
                        {p.onHand}
                      </td>
                      <td className="py-2 text-right text-xs font-medium text-text-muted">
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
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
