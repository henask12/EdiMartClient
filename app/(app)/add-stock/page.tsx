"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ReceiveStockModal, type ReceiveStockProduct } from "@/components/ReceiveStockModal";
import { dedupeCategories } from "@/lib/dedupe-categories";
import { formatBirr } from "@/lib/format-price";

type Category = { id: string; name: string };
type StockRow = {
  id: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  onHand: string;
  available: string;
  restockAt: number;
  stockStatus?: string;
  category: { id: string; name: string };
  productType?: { id: string; name: string } | null;
};

const stockLabel = (row: StockRow) => {
  const available = Number(row.available);
  if (available <= 0) return "OUT of Stock";
  if (available <= row.restockAt) return "Low";
  return "In stock";
};

export default function AddStockPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<StockRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [receiveProduct, setReceiveProduct] = useState<ReceiveStockProduct | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [batches, setBatches] = useState<
    { id: string; qtyReceived: string; unitCost: string; expiryDate: string | null; receivedAt: string }[]
  >([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    void fetch("/api/proxy/categories", { cache: "no-store" }).then(async (res) => {
      if (res.ok) setCategories(dedupeCategories((await res.json()) as Category[]));
    });
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("productId");
    if (preselect) setExpandedId(preselect);
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(pageSize),
        skip: String((page - 1) * pageSize),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      if (categoryId) params.set("categoryId", categoryId);
      if (stockStatus) params.set("stockStatus", stockStatus);
      const res = await fetch(`/api/proxy/products?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load products");
      const data = (await res.json()) as { items: StockRow[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [debouncedQ, categoryId, stockStatus, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadBatches = async (productId: string) => {
    const res = await fetch(`/api/proxy/stock/batches?productId=${productId}&take=20`, {
      cache: "no-store",
    });
    if (res.ok) setBatches(await res.json());
    else setBatches([]);
  };

  const handleExpand = (row: StockRow) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      setBatches([]);
      return;
    }
    setExpandedId(row.id);
    void loadBatches(row.id);
  };

  const columns: DataTableColumn<StockRow>[] = [
    {
      key: "name",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.name}</p>
          <p className="text-xs text-white/45">
            {row.productType?.name ?? "—"} · {row.category.name}
          </p>
        </div>
      ),
    },
    {
      key: "onHand",
      header: "On hand",
      className: "tabular-nums",
      render: (row) => row.onHand,
    },
    {
      key: "available",
      header: "Available",
      className: "tabular-nums",
      render: (row) => row.available,
    },
    {
      key: "cost",
      header: "Cost",
      className: "tabular-nums",
      render: (row) => formatBirr(row.costPrice),
    },
    {
      key: "price",
      header: "Sell",
      className: "tabular-nums",
      render: (row) => formatBirr(row.sellingPrice),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const label = stockLabel(row);
        const cls =
          label === "OUT of Stock"
            ? "text-rose-200"
            : label === "Low"
              ? "text-amber-200"
              : "text-emerald-200";
        return <span className={`text-xs font-semibold ${cls}`}>{label}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => handleExpand(row)}
            className="tap rounded-lg border border-white/15 px-2 py-1 text-xs text-white/70"
          >
            {expandedId === row.id ? "Hide" : "History"}
          </button>
          <button
            type="button"
            onClick={() =>
              setReceiveProduct({
                id: row.id,
                name: row.name,
                costPrice: row.costPrice,
                sellingPrice: row.sellingPrice,
                onHand: row.onHand,
              })
            }
            className="tap rounded-lg border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-2 py-1 text-xs font-semibold text-[var(--accent)]"
          >
            Add stock
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Add stock</h1>
        <p className="mt-2 text-sm text-white/60">
          View inventory levels and receive stock into any product.
        </p>
      </header>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Search name or SKU…"
        className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCategoryId("");
            setPage(1);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            !categoryId ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]" : "bg-white/5 text-white/60"
          }`}
        >
          All categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategoryId(c.id);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              categoryId === c.id
                ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]"
                : "bg-white/5 text-white/60"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "All stock" },
          { value: "in_stock", label: "In stock" },
          { value: "low", label: "Low" },
          { value: "out", label: "OUT of Stock" },
        ].map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStockStatus(f.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              stockStatus === f.value ? "bg-white/10 text-white" : "bg-white/5 text-white/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        emptyMessage="No products match your filters."
        mobileCard={(row) => (
          <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-4 text-sm">
            <p className="font-medium text-white">{row.name}</p>
            <p className="text-xs text-white/50">
              {row.category.name} · On hand {row.onHand} · {stockLabel(row)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleExpand(row)}
                className="tap flex-1 rounded-lg border border-white/15 py-2 text-xs text-white/70"
              >
                History
              </button>
              <button
                type="button"
                onClick={() =>
                  setReceiveProduct({
                    id: row.id,
                    name: row.name,
                    costPrice: row.costPrice,
                    sellingPrice: row.sellingPrice,
                    onHand: row.onHand,
                  })
                }
                className="tap flex-1 rounded-lg border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 py-2 text-xs font-semibold text-[var(--accent)]"
              >
                Add stock
              </button>
            </div>
          </div>
        )}
      />

      {expandedId && batches.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-sm font-semibold text-white/70">Recent receipts</h2>
          <ul className="mt-3 space-y-2 text-xs text-white/70">
            {batches.map((b) => (
              <li key={b.id} className="flex justify-between border-b border-white/5 py-2">
                <span>{b.receivedAt.slice(0, 10)}</span>
                <span className="tabular-nums">
                  +{b.qtyReceived} @ {b.unitCost}
                </span>
                <span>{b.expiryDate?.slice(0, 10) ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[15, 25, 50, 100]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <ReceiveStockModal
        product={receiveProduct}
        onClose={() => setReceiveProduct(null)}
        onSuccess={() => void load()}
      />
    </div>
  );
}
