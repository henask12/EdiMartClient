"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { formatBirr } from "@/lib/format-price";

type Attachment = { id: string; imageUrl: string };
type SaleLine = {
  id: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  unitCostAtSale: string;
  netProfit: string;
  product: { name: string; category?: { name: string } };
};
type Sale = {
  id: string;
  saleNumber: string;
  createdAt: string;
  lines: SaleLine[];
  attachments?: Attachment[];
  createdBy: { displayName: string | null; email: string };
};

type SaleLineRow = {
  rowKey: string;
  saleId: string;
  item: string;
  salesDate: string;
  cashier: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
  netProfit: string;
  attachments: Attachment[];
};

type Category = { id: string; name: string };
type Product = { id: string; name: string };

const flattenSales = (sales: Sale[]): SaleLineRow[] =>
  sales.flatMap((sale) =>
    sale.lines.map((line) => ({
      rowKey: `${sale.id}-${line.id}`,
      saleId: sale.id,
      item: line.product.name,
      salesDate: sale.createdAt,
      cashier: sale.createdBy.displayName ?? sale.createdBy.email,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
      netProfit: line.netProfit,
      attachments: sale.attachments ?? [],
    })),
  );

export default function SalesPage() {
  const searchParams = useSearchParams();
  const urlFrom = searchParams.get("from") ?? "";
  const urlTo = searchParams.get("to") ?? "";

  const [items, setItems] = useState<Sale[]>([]);
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);
  const [draftFrom, setDraftFrom] = useState(urlFrom);
  const [draftTo, setDraftTo] = useState(urlTo);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const lineRows = useMemo(() => flattenSales(items), [items]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/proxy/categories", { cache: "no-store" }),
      fetch("/api/proxy/products?take=300", { cache: "no-store" }),
    ]).then(async ([catRes, prodRes]) => {
      if (catRes.ok) setCategories((await catRes.json()) as Category[]);
      if (prodRes.ok) {
        const data = (await prodRes.json()) as { items: Product[] };
        setProducts(data.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(pageSize),
        skip: String((page - 1) * pageSize),
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (productId) params.set("productId", productId);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`/api/proxy/sales?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load sales");
      const data = (await res.json()) as { items: Sale[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [from, to, productId, categoryId, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApplyDates = () => {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setDateError("“From” must be on or before “To”.");
      return;
    }
    setDateError(null);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  };

  const columns: DataTableColumn<SaleLineRow>[] = [
    {
      key: "item",
      header: "Item",
      render: (r) => <span className="font-medium text-white">{r.item}</span>,
    },
    {
      key: "date",
      header: "Sales date",
      render: (r) => new Date(r.salesDate).toLocaleString(),
    },
    {
      key: "cashier",
      header: "Cashier",
      render: (r) => r.cashier,
    },
    {
      key: "unitPrice",
      header: "Unit price",
      className: "tabular-nums",
      render: (r) => formatBirr(r.unitPrice),
    },
    {
      key: "quantity",
      header: "Quantity",
      className: "tabular-nums",
      render: (r) => r.quantity,
    },
    {
      key: "lineTotal",
      header: "Total price",
      className: "tabular-nums",
      render: (r) => formatBirr(r.lineTotal),
    },
    {
      key: "netProfit",
      header: "Net profit",
      className: "tabular-nums",
      render: (r) => {
        const profit = Number(r.netProfit);
        return (
          <span className={profit >= 0 ? "text-[var(--accent)]" : "text-rose-300"}>
            {formatBirr(r.netProfit)}
          </span>
        );
      },
    },
    {
      key: "proof",
      header: "Proof",
      render: (r) =>
        r.attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {r.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block h-10 w-10 overflow-hidden rounded border border-white/10"
                  aria-label="View payment proof"
                >
                  <Image src={a.imageUrl} alt="" fill className="object-cover" unoptimized />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-white/40">—</span>
        ),
    },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Sales history</h1>
        <p className="mt-2 text-sm text-white/60">
          One row per line item — unit price, quantity, profit, and payment proof.
        </p>
      </header>

      <DateRangeFilter
        from={draftFrom}
        to={draftTo}
        onFromChange={setDraftFrom}
        onToChange={setDraftTo}
        onApply={handleApplyDates}
      />
      {dateError ? <p className="text-sm text-rose-200">{dateError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-white/70">
          Category
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      <ExportMenu
        basePath="sales/export"
        queryParams={{
          from: from || undefined,
          to: to || undefined,
          productId: productId || undefined,
          categoryId: categoryId || undefined,
        }}
      />

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={lineRows}
        rowKey={(r) => r.rowKey}
        emptyMessage="No sales in this range."
        mobileCard={(r) => {
          const profit = Number(r.netProfit);
          return (
            <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/80 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <p className="font-medium text-white">{r.item}</p>
                <p className="font-semibold tabular-nums text-[var(--accent)]">
                  {formatBirr(r.lineTotal)}
                </p>
              </div>
              <p className="mt-1 text-xs text-white/50">
                {new Date(r.salesDate).toLocaleString()} · {r.cashier}
              </p>
              <p className="mt-2 text-xs text-white/60">
                {r.quantity} × {formatBirr(r.unitPrice)} · Profit{" "}
                <span className={profit >= 0 ? "text-[var(--accent)]" : "text-rose-300"}>
                  {formatBirr(r.netProfit)}
                </span>
              </p>
              {r.attachments.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {r.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={a.imageUrl} target="_blank" rel="noopener noreferrer">
                        <span className="relative block h-12 w-12 overflow-hidden rounded-lg border border-white/10">
                          <Image src={a.imageUrl} alt="Proof" fill className="object-cover" unoptimized />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        }}
      />

      <footer className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[15, 30, 50]}
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
