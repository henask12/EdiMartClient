"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePermission } from "@/components/PermissionProvider";
import { SalesPeriodModal } from "@/components/SalesPeriodModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatBirr } from "@/lib/format-price";
import { toastError } from "@/lib/toast";
import type { PeriodKey } from "@/lib/period-bounds";
import { requirementForPath } from "@/lib/permissions";

type PeriodSummary = {
  grandTotal: string;
  saleCount: number;
  /** Only sent to people allowed to see profit. */
  netProfit?: string;
};

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
  today: PeriodSummary;
  week: PeriodSummary;
  month: PeriodSummary;
  year: PeriodSummary;
  needsRestock: RestockItem[];
  expiringSoon: Expiring[];
  openReservations: OpenReservation[];
  productCount: number;
};

const PERIOD_CARDS: {
  key: PeriodKey;
  label: string;
  dataKey: keyof Pick<Dashboard, "today" | "week" | "month" | "year">;
}[] = [
  { key: "today", label: "Today", dataKey: "today" },
  { key: "week", label: "This week", dataKey: "week" },
  { key: "month", label: "This month", dataKey: "month" },
  { key: "year", label: "This year", dataKey: "year" },
];

export default function DashboardPage() {
  const { can, canAny, meets, me } = usePermission();
  const canReport = can("REPORTING_VIEW");
  const canDrill = canAny("SALES_VIEW", "SALES_VIEW_OWN", "SALES_VIEW_ALL");
  const [data, setData] = useState<Dashboard | null>(null);
  const [periodModal, setPeriodModal] = useState<{
    period: PeriodKey;
    total: string;
    netProfit?: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!canReport) return;
    const load = async () => {
      try {
        const res = await fetch("/api/proxy/reporting/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load dashboard");
        setData((await res.json()) as Dashboard);
      } catch (e) {
        toastError(e instanceof Error ? e.message : "Error loading dashboard");
      }
    };
    void load();
  }, [canReport]);

  if (!canReport) {
    // no reports for this role: a simple start page with the places they can go
    const places = [
      { href: "/sell", label: "Record a sale" },
      { href: "/products", label: "Products" },
      { href: "/sales", label: "Sales" },
      { href: "/reservations", label: "Reservations" },
      { href: "/add-stock", label: "Stocks" },
      { href: "/expiry", label: "Expiry" },
      { href: "/stock-history", label: "Stock history" },
    ].filter((p) => meets(requirementForPath(p.href)));
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${me.displayName ?? me.email}`}
          description="Pick what you want to do."
        />
        {places.length === 0 ? (
          <p className="text-sm text-white/60">
            Your role does not have access to any pages yet. Ask the shop owner to set it up.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((p) => (
              <Link key={p.href} href={p.href} className="tap card-surface block p-5 text-lg font-semibold text-white">
                {p.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-white/60">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sales, restock alerts, expiring batches, and reservations."
        actions={
          <>
            {can("SALES_CREATE") ? (
              <Link href="/sell">
                <Button type="button" size="sm">
                  Record sale
                </Button>
              </Link>
            ) : null}
            {can("STOCK_RECEIVE") ? (
              <Link href="/add-stock">
                <Button type="button" variant="secondary" size="sm">
                  Stocks
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

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
                  netProfit: summary.netProfit,
                  count: summary.saleCount,
                })
              }
              disabled={!canDrill}
              className="tap card-surface relative p-5 text-left transition enabled:hover:border-[var(--brand-yellow)]/30 disabled:cursor-default"
              aria-label={canDrill ? `View ${p.label} sales details` : `${p.label} sales`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                {p.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                {formatBirr(summary.grandTotal)}
              </div>
              <p className="mt-1 text-sm text-white/55">{summary.saleCount} sales</p>
              {canDrill ? <p className="mt-2 text-xs text-[var(--accent-2)]">View details →</p> : null}
              {summary.netProfit !== undefined ? (
                <p className="absolute bottom-4 right-4 text-[10px] tabular-nums text-white/45">
                  Profit {formatBirr(summary.netProfit)}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="section-card">
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
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{item.name}</span>
                    <Badge variant={item.status === "OUT" ? "danger" : "warning"}>
                      {item.status === "OUT" ? "OUT of Stock" : "Low"}
                    </Badge>
                  </div>
                  <span className="text-white/55">
                    {item.available} avail · reorder {item.restockQty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-card">
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
                  className="rounded-[var(--radius-md)] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                >
                  {b.productName} · {b.qtyRemaining} left · {b.expiryDate ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="section-card">
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
                className="rounded-[var(--radius-md)] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
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
          summaryNetProfit={periodModal.netProfit}
          summaryCount={periodModal.count}
          onClose={() => setPeriodModal(null)}
        />
      ) : null}
    </div>
  );
}
