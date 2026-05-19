"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";

const MOVEMENT_TYPES = [
  "",
  "RECEIPT",
  "SALE",
  "RETURN",
  "ADJUSTMENT",
  "TRANSFER",
  "RESERVE",
  "RELEASE_RESERVE",
  "DAMAGE",
] as const;

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
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      take: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (productId) params.set("productId", productId);
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/proxy/stock/history?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: Movement[]; total: number };
      setMovements(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [productId, type, from, to, page, pageSize]);

  useEffect(() => {
    void fetch("/api/proxy/products?take=200", { cache: "no-store" }).then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as { items: Product[] };
        setProducts(data.items);
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<Movement>[] = [
    {
      key: "product",
      header: "Product",
      render: (m) => (
        <div>
          <p className="font-medium text-white">{m.inventoryItem.product.name}</p>
          <p className="text-xs text-white/45">{m.inventoryItem.product.category.name}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (m) => new Date(m.createdAt).toLocaleString(),
    },
    {
      key: "type",
      header: "Type",
      render: (m) => m.type,
    },
    {
      key: "qty",
      header: "Qty Δ",
      className: "tabular-nums",
      render: (m) => {
        const positive = Number(m.qtyDelta) >= 0;
        return (
          <span className={positive ? "text-[var(--accent)]" : "text-rose-300"}>
            {positive ? "+" : ""}
            {m.qtyDelta}
          </span>
        );
      },
    },
    {
      key: "onHand",
      header: "On hand",
      render: (m) => `${m.beforeOnHand ?? "—"} → ${m.afterOnHand ?? "—"}`,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (m) => (
        <Link href={`/stock-history/${m.id}`} className="text-xs font-semibold text-[var(--accent-2)]">
          View
        </Link>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Stock history</h1>
        <p className="mt-2 text-sm text-white/60">
          Paginated ledger — tap View for full movement detail.
        </p>
      </header>

      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={(v) => {
          setFrom(v);
          setPage(1);
        }}
        onToChange={(v) => {
          setTo(v);
          setPage(1);
        }}
        onApply={() => void load()}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-white/70">
          Product
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
        <label className="block text-sm text-white/70">
          Movement type
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t || "all"} value={t}>
                {t || "All types"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ExportMenu
        basePath="stock/history/export"
        queryParams={{
          productId: productId || undefined,
          type: type || undefined,
          from: from || undefined,
          to: to || undefined,
        }}
      />

      {loading ? <p className="text-sm text-white/50">Loading…</p> : null}

      <DataTable
        columns={columns}
        rows={movements}
        rowKey={(m) => m.id}
        emptyMessage="No movements match filters."
        mobileCard={(m) => {
          const positive = Number(m.qtyDelta) >= 0;
          return (
            <Link
              href={`/stock-history/${m.id}`}
              className="block rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-4 text-sm"
            >
              <p className="font-medium text-white">{m.inventoryItem.product.name}</p>
              <p className="text-xs text-white/50">
                {new Date(m.createdAt).toLocaleString()} · {m.type}
              </p>
              <p
                className={`mt-1 tabular-nums font-semibold ${
                  positive ? "text-[var(--accent)]" : "text-rose-300"
                }`}
              >
                {positive ? "+" : ""}
                {m.qtyDelta}
              </p>
            </Link>
          );
        }}
      />

      <footer className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[15, 25, 50, 100]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </footer>
    </section>
  );
}
