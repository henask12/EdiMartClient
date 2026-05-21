"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SalesPeriodModal } from "@/components/SalesPeriodModal";
import { formatBirr } from "@/lib/format-price";
import type { PeriodKey } from "@/lib/period-bounds";

type RestockItem = {
  id: string;
  name: string;
  quantityOnHand: string;
  available: string;
  reserved: string;
  restockAt: number;
  restockQty: number;
  status: "OUT" | "LOW";
};

type Expiring = {
  id: string;
  productName: string;
  qtyRemaining: string;
  expiryDate: string | null;
};

type OpenReservation = {
  id: string;
  productName: string;
  quantity: string;
  customerName: string | null;
};

type Dashboard = {
  today: { grandTotal: string; saleCount: number };
  week: { grandTotal: string; saleCount: number };
  month: { grandTotal: string; saleCount: number };
  year: { grandTotal: string; saleCount: number };
  needsRestock: RestockItem[];
  expiringSoon: Expiring[];
  openReservations: OpenReservation[];
  productCount: number;
};

const PERIOD_CARDS: { key: PeriodKey; label: string; dataKey: keyof Pick<Dashboard, "today" | "week" | "month" | "year"> }[] = [
  { key: "today", label: "Today", dataKey: "today" },
  { key: "week", label: "This week", dataKey: "week" },
  { key: "month", label: "This month", dataKey: "month" },
  { key: "year", label: "This year", dataKey: "year" },
];

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodModal, setPeriodModal] = useState<{
    period: PeriodKey;
    total: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proxy/reporting/dashboard", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load");
        }
        setData((await res.json()) as Dashboard);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    };
    void load();
  }, []);

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-white/60">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Sales, restock alerts, expiring batches, and reservations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sell" className="btn-primary px-4 py-2 text-sm">
            Record sale
          </Link>
          <Link
            href="/add-stock"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
          >
            Stocks
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PERIOD_CARDS.map((p) => {
          const summary = data[p.dataKey];
          return (
            <button
              key={p.key}
              type="button"
              onClick={() =>
                setPeriodModal({
                  period: p.key,
                  total: summary.grandTotal,
                  count: summary.saleCount,
                })
              }
              className="tap rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5 text-left transition hover:border-[var(--brand-yellow)]/30 hover:bg-[color:var(--surface)]"
              aria-label={`View ${p.label} sales details`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                {p.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                {formatBirr(summary.grandTotal)}
              </div>
              <p className="mt-1 text-sm text-white/55">{summary.saleCount} sales</p>
              <p className="mt-2 text-xs text-[var(--accent-2)]">View details →</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[color:var(--surface-2)]/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Restock soon ({data.needsRestock.length})
          </h2>
          {data.needsRestock.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">All products above alert level.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.needsRestock.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-white">{item.name}</span>
                    <span
                      className={`ml-2 text-xs uppercase ${
                        item.status === "OUT" ? "text-rose-300" : "text-amber-300"
                      }`}
                    >
                      {item.status === "OUT" ? "OUT of Stock" : "Low"}
                    </span>
                  </div>
                  <span className="text-white/55">
                    {item.available} avail · reorder {item.restockQty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[color:var(--surface-2)]/70 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Expiring soon ({data.expiringSoon.length})
            </h2>
            <Link href="/expiry" className="text-xs font-semibold text-[var(--accent-2)]">
              View all
            </Link>
          </div>
          {data.expiringSoon.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">No batches expiring soon.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.expiringSoon.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                >
                  {b.productName} · {b.qtyRemaining} left · {b.expiryDate ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[color:var(--surface-2)]/70 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Open reservations ({data.openReservations.length})
          </h2>
          <Link href="/reservations" className="text-xs font-semibold text-[var(--accent-2)]">
            View all
          </Link>
        </div>
        {data.openReservations.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">No active reservations.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.openReservations.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              >
                {r.productName} · qty {r.quantity}
                {r.customerName ? ` · ${r.customerName}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-white/45">{data.productCount} products tracked</p>

      {periodModal ? (
        <SalesPeriodModal
          period={periodModal.period}
          summaryTotal={periodModal.total}
          summaryCount={periodModal.count}
          onClose={() => setPeriodModal(null)}
        />
      ) : null}
    </div>
  );
}
