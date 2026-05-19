"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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
  lineTotal: string;
  product: { name: string };
};
type Sale = {
  id: string;
  saleNumber: string;
  grandTotal: string;
  createdAt: string;
  lines: SaleLine[];
  attachments?: Attachment[];
  createdBy: { displayName: string | null; email: string };
};

export default function SalesPage() {
  const [items, setItems] = useState<Sale[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(pageSize),
        skip: String((page - 1) * pageSize),
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/proxy/sales?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load sales");
      const data = (await res.json()) as { items: Sale[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [from, to, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<Sale>[] = [
    {
      key: "saleNumber",
      header: "Sale #",
      render: (s) => <span className="font-medium text-white">{s.saleNumber}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (s) => new Date(s.createdAt).toLocaleString(),
    },
    {
      key: "cashier",
      header: "Cashier",
      render: (s) => s.createdBy.displayName ?? s.createdBy.email,
    },
    {
      key: "total",
      header: "Total",
      className: "tabular-nums",
      render: (s) => formatBirr(s.grandTotal),
    },
    {
      key: "proof",
      header: "Proof",
      render: (s) =>
        s.attachments && s.attachments.length > 0 ? (
          <span className="text-xs text-[var(--accent-2)]">{s.attachments.length} file(s)</span>
        ) : (
          <span className="text-xs text-white/40">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <button
          type="button"
          onClick={() => setViewSale(s)}
          className="tap text-xs font-semibold text-[var(--accent-2)]"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Sales history</h1>
        <p className="mt-2 text-sm text-white/60">Filter by date, export, view payment proofs.</p>
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

      <ExportMenu basePath="sales/export" queryParams={{ from: from || undefined, to: to || undefined }} />

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(s) => s.id}
        emptyMessage="No sales in this range."
        mobileCard={(sale) => (
          <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/80 p-4 text-sm">
            <div className="flex justify-between gap-2">
              <p className="font-semibold text-white">{sale.saleNumber}</p>
              <p className="font-semibold text-[var(--accent)]">{formatBirr(sale.grandTotal)}</p>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {new Date(sale.createdAt).toLocaleString()}
            </p>
            <button
              type="button"
              onClick={() => setViewSale(sale)}
              className="tap mt-2 text-xs font-semibold text-[var(--accent-2)]"
            >
              View details
            </button>
          </div>
        )}
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

      {viewSale ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--surface)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{viewSale.saleNumber}</h2>
                <p className="text-xs text-white/50">
                  {new Date(viewSale.createdAt).toLocaleString()} ·{" "}
                  {viewSale.createdBy.displayName ?? viewSale.createdBy.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewSale(null)}
                className="text-sm text-white/60"
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-xl font-semibold text-[var(--accent)]">
              {formatBirr(viewSale.grandTotal)}
            </p>
            <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
              {viewSale.lines.map((line) => (
                <li key={line.id} className="flex justify-between text-white/80">
                  <span>
                    {line.product.name} × {line.quantity}
                  </span>
                  <span className="tabular-nums">{formatBirr(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {viewSale.attachments && viewSale.attachments.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {viewSale.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={a.imageUrl} target="_blank" rel="noopener noreferrer">
                      <span className="relative block h-16 w-16 overflow-hidden rounded-lg border border-white/10">
                        <Image src={a.imageUrl} alt="Proof" fill className="object-cover" unoptimized />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
