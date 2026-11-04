"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePermission } from "@/components/PermissionProvider";
import { SalesPeriodModal } from "@/components/SalesPeriodModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/format-money";
import { toastError } from "@/lib/toast";
import type { PeriodKey } from "@/lib/period-bounds";
import { requirementForPath } from "@/lib/permissions";

type PeriodSummary = {
  grandTotal: string;
  saleCount: number;
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
  labelKey: string;
  dataKey: keyof Pick<Dashboard, "today" | "week" | "month" | "year">;
}[] = [
  { key: "today", labelKey: "today", dataKey: "today" },
  { key: "week", labelKey: "thisWeek", dataKey: "week" },
  { key: "month", labelKey: "thisMonth", dataKey: "month" },
  { key: "year", labelKey: "thisYear", dataKey: "year" },
];

export default function DashboardPage() {
  const { can, canAny, meets, me } = usePermission();
  const t = useTranslations("Dashboard");
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
        const res = await fetch("/api/proxy/reporting/dashboard", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load dashboard");
        setData((await res.json()) as Dashboard);
      } catch (e) {
        toastError(e instanceof Error ? e.message : "Error loading dashboard");
      }
    };
    void load();
  }, [canReport]);

  if (!canReport) {
    const places = [
      { href: "/sell", label: t("recordSale") },
      { href: "/products", label: "Products" },
      { href: "/sales", label: "Sales" },
      { href: "/reservations", label: "Reservations" },
      { href: "/add-stock", label: t("stocks") },
      { href: "/expiry", label: "Expiry" },
      { href: "/stock-history", label: "Stock history" },
    ].filter((p) => meets(requirementForPath(p.href)));

    return (
      <div className="space-y-6">
        <PageHeader
          title={t("welcome", { name: me.displayName ?? me.email })}
          description={t("pickAction")}
        />
        {places.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noAccess")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="tap block rounded-xl border border-border bg-surface p-5 text-lg font-semibold text-text shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                {p.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {can("SALES_CREATE") ? (
              <Button asChild size="sm">
                <Link href="/sell">{t("recordSale")}</Link>
              </Button>
            ) : null}
            {can("STOCK_RECEIVE") ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/add-stock">{t("stocks")}</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PERIOD_CARDS.map((p) => {
          const summary = data[p.dataKey];
          return (
            <StatCard
              key={p.key}
              label={t(p.labelKey)}
              value={formatMoney(summary.grandTotal)}
              detail={`${summary.saleCount} sales`}
              onClick={
                canDrill
                  ? () =>
                      setPeriodModal({
                        period: p.key,
                        total: summary.grandTotal,
                        netProfit: summary.netProfit,
                        count: summary.saleCount,
                      })
                  : undefined
              }
            />
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t("restockSoon", { count: data.needsRestock.length })}
          </h2>
          {data.needsRestock.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">{t("allAboveAlert")}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.needsRestock.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{item.name}</span>
                    <Badge
                      variant={item.status === "OUT" ? "danger" : "warning"}
                    >
                      {item.status === "OUT" ? "OUT of Stock" : "Low"}
                    </Badge>
                  </div>
                  <span className="text-text-muted">
                    {item.available} {t("available")} · {t("reorder")}{" "}
                    {item.restockQty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t("expiringSoon", { count: data.expiringSoon.length })}
            </h2>
            <Link href="/expiry" className="text-xs font-semibold text-primary">
              {/* View all */}
            </Link>
          </div>
          {data.expiringSoon.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">
              {t("noBatchesExpiring")}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.expiringSoon.map((b) => (
                <li
                  key={b.id}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-text"
                >
                  {b.productName} · {b.qtyRemaining} {t("left")} ·{" "}
                  {b.expiryDate ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t("openReservations", {
              count: data.openReservations.length,
            })}
          </h2>
          <Link
            href="/reservations"
            className="text-xs font-semibold text-primary"
          >
            {/* View all */}
          </Link>
        </div>
        {data.openReservations.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">{t("noReservations")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.openReservations.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-text"
              >
                {r.productName} · qty {r.quantity}
                {r.customerName ? ` · ${r.customerName}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-sm text-text-muted">
        {t("productsTracked", { count: data.productCount })}
      </p>

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
