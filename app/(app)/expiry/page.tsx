"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

type ExpiryRow = {
  id: string;
  source: "batch" | "product";
  productId: string;
  productName: string;
  categoryName: string;
  qtyRemaining: string;
  expiryDate: string;
  daysLeft: number;
  status: "expired" | "expiring" | "ok";
};

type StatusFilter = "expiring" | "expired" | "all";

export default function ExpiryPage() {
  const [status, setStatus] = useState<StatusFilter>("expiring");
  const [items, setItems] = useState<ExpiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, days: "7" });
      const res = await fetch(`/api/proxy/inventory/expiry?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load expiry data");
      const data = (await res.json()) as { items: ExpiryRow[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusBadge = (row: ExpiryRow) => {
    if (row.status === "expired") {
      return (
        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-200">
          Expired
        </span>
      );
    }
    if (row.status === "expiring") {
      return (
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
          Expiring soon
        </span>
      );
    }
    return (
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/50">
        OK
      </span>
    );
  };

  const columns: DataTableColumn<ExpiryRow>[] = [
    {
      key: "product",
      header: "Product",
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.productName}</p>
          <p className="text-xs text-white/45">{r.categoryName}</p>
        </div>
      ),
    },
    {
      key: "qty",
      header: "On hand",
      className: "tabular-nums",
      render: (r) => r.qtyRemaining,
    },
    {
      key: "expiry",
      header: "Expiry",
      render: (r) => r.expiryDate,
    },
    {
      key: "days",
      header: "Days left",
      className: "tabular-nums",
      render: (r) => (r.daysLeft < 0 ? `${Math.abs(r.daysLeft)}d ago` : `${r.daysLeft}d`),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => statusBadge(r),
    },
    {
      key: "source",
      header: "Source",
      render: (r) => (
        <span className="text-xs text-white/45">{r.source === "batch" ? "Batch" : "Product"}</span>
      ),
    },
  ];

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "expiring", label: "Expiring soon" },
    { value: "expired", label: "Expired" },
    { value: "all", label: "All with expiry" },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Expiry alerts</h1>
        <p className="mt-2 text-sm text-white/60">
          On-hand stock with batch or product expiry dates.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`tap rounded-full border px-4 py-2 text-sm font-semibold ${
              status === f.value
                ? "border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)]/10 text-[var(--accent)]"
                : "border-white/15 bg-white/5 text-white/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      {loading ? <p className="text-sm text-white/50">Loading…</p> : null}

      {!loading ? (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          emptyMessage="No items match this filter."
          mobileCard={(r) => (
            <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/80 p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{r.productName}</p>
                  <p className="text-xs text-white/45">{r.categoryName}</p>
                </div>
                {statusBadge(r)}
              </div>
              <p className="mt-2 text-white/70">
                {r.qtyRemaining} on hand · expires {r.expiryDate}
              </p>
              <Link
                href={`/products/${r.productId}/edit`}
                className="tap mt-2 inline-block text-xs font-semibold text-[var(--accent-2)]"
              >
                Edit product
              </Link>
            </div>
          )}
        />
      ) : null}
    </section>
  );
}
