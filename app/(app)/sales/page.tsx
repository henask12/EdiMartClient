"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";

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

      <ul className="space-y-3">
        {items.map((sale) => (
          <li key={sale.id} className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{sale.saleNumber}</p>
                <p className="text-xs text-white/50">
                  {new Date(sale.createdAt).toLocaleString()} ·{" "}
                  {sale.createdBy.displayName ?? sale.createdBy.email}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums text-[var(--accent)]">{sale.grandTotal}</p>
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
            {sale.attachments && sale.attachments.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                {sale.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={a.imageUrl} target="_blank" rel="noopener noreferrer">
                      <span className="relative block h-14 w-14 overflow-hidden rounded-lg border border-white/10">
                        <Image src={a.imageUrl} alt="Proof" fill className="object-cover" unoptimized />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
        {items.length === 0 && !error ? (
          <li className="text-center text-sm text-white/50">No sales in this range.</li>
        ) : null}
      </ul>

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
