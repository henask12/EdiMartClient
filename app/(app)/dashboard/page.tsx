"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePermission } from "@/components/PermissionProvider";
import { SalesPeriodModal } from "@/components/SalesPeriodModal";
import { PeriodPresetBar } from "@/components/reporting/PeriodPresetBar";
import { SalesByHourChart } from "@/components/reporting/SalesByHourChart";
import { SimpleReportChart } from "@/components/reporting/SimpleReportChart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  formatDateShort,
  formatEthiopianDate,
  toDateInput,
} from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import { paymentLabel } from "@/lib/payment-methods";
import type { PeriodKey } from "@/lib/period-bounds";
import { requirementForPath } from "@/lib/permissions";
import {
  dashboardKpis,
  dashboardNeedsAttention,
  fetchDashboard,
  resolvePresetRange,
  type DashboardPayload,
  type ReportPreset,
} from "@/lib/reporting";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/cn";

const severityVariant = (severity?: string): "danger" | "warning" | "info" | "neutral" => {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "neutral";
};

const kpiIsMoney = (key: string) =>
  !["transactions", "saleCount", "count", "skuCount"].includes(key);

export default function DashboardPage() {
  const { can, canAny, canSeeCost, meets, me } = usePermission();
  const t = useTranslations("Dashboard");
  const tReports = useTranslations("Reports");
  const canReport = can("REPORTING_VIEW");
  const canDrill = canAny("SALES_VIEW", "SALES_VIEW_OWN", "SALES_VIEW_ALL");

  const [preset, setPreset] = useState<ReportPreset>("today");
  const [from, setFrom] = useState(() => toDateInput(new Date()));
  const [to, setTo] = useState(() => toDateInput(new Date()));
  const [customApplied, setCustomApplied] = useState({ from: "", to: "" });
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodModal, setPeriodModal] = useState<{
    period: PeriodKey;
    total: string;
    netProfit?: string;
    count: number;
  } | null>(null);

  const range = useMemo(() => {
    if (preset === "custom") {
      return resolvePresetRange("custom", {
        from: customApplied.from || from,
        to: customApplied.to || to,
      });
    }
    return resolvePresetRange(preset);
  }, [preset, customApplied, from, to]);

  const load = useCallback(async () => {
    if (!canReport) return;
    setLoading(true);
    try {
      const payload = await fetchDashboard({
        preset,
        from: range.from,
        to: range.to,
      });
      if (!payload) {
        toastError(t("loadFailed"));
        setData(null);
        return;
      }
      setData(payload);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [canReport, preset, range.from, range.to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePresetChange = (next: ReportPreset) => {
    setPreset(next);
    if (next !== "custom") {
      const r = resolvePresetRange(next);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const businessDate = data?.businessDate ?? toDateInput(new Date());
  const ethiopian = formatEthiopianDate(businessDate);
  const greetingName = me.displayName ?? me.email;

  const kpis = data
    ? dashboardKpis(data, { includeProfit: canSeeCost, preset })
    : [];
  const needsAttention = data ? dashboardNeedsAttention(data) : [];
  const paymentChart = (data?.paymentsByMethod ?? []).map((p) => ({
    name: p.label ?? paymentLabel(p.method) ?? p.method,
    value: Number(p.amount) || 0,
  }));

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
          title={t("welcome", { name: greetingName })}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("greeting", { name: greetingName })}
        description={
          ethiopian
            ? `${formatDateShort(businessDate)} · ${ethiopian}`
            : formatDateShort(businessDate)
        }
        actions={
          <>
            {can("REPORTING_VIEW") ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/reports">{tReports("title")}</Link>
              </Button>
            ) : null}
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

      <PeriodPresetBar
        preset={preset}
        from={from}
        to={to}
        onPresetChange={handlePresetChange}
        onFromChange={setFrom}
        onToChange={setTo}
        onApplyCustom={() => {
          setCustomApplied({ from, to });
        }}
      />

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const display = kpiIsMoney(kpi.key)
                ? formatMoney(String(kpi.value))
                : String(kpi.value);
              const drillPeriod: PeriodKey | null =
                kpi.key === "sales"
                  ? preset === "this_week"
                    ? "week"
                    : preset === "this_month" || preset === "last_month"
                      ? "month"
                      : "today"
                  : null;
              const summary =
                drillPeriod === "week"
                  ? data.week
                  : drillPeriod === "month"
                    ? data.month
                    : data.today;
              return (
                <StatCard
                  key={kpi.key}
                  label={kpi.label ?? kpi.key}
                  value={display}
                  deltaPct={kpi.deltaPct}
                  onClick={
                    canDrill && drillPeriod && summary
                      ? () =>
                          setPeriodModal({
                            period: drillPeriod,
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

          {/* Legacy period cards when new KPIs missing but legacy present */}
          {kpis.length === 0 && data.today ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["today", data.today, "today"],
                  ["week", data.week, "thisWeek"],
                  ["month", data.month, "thisMonth"],
                  ["year", data.year, "thisYear"],
                ] as const
              ).map(([period, summary, labelKey]) =>
                summary ? (
                  <StatCard
                    key={period}
                    label={t(labelKey)}
                    value={formatMoney(summary.grandTotal)}
                    detail={`${summary.saleCount} ${t("salesCount")}`}
                    deltaPct={summary.deltaPct}
                    onClick={
                      canDrill
                        ? () =>
                            setPeriodModal({
                              period,
                              total: summary.grandTotal,
                              netProfit: summary.netProfit,
                              count: summary.saleCount,
                            })
                        : undefined
                    }
                  />
                ) : null,
              )}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                {t("salesByHour")}
              </h2>
              <div className="mt-4">
                <SalesByHourChart
                  data={data.salesByHour ?? []}
                  emptyLabel={t("noHourlySales")}
                />
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                {t("paymentsByMethod")}
              </h2>
              <div className="mt-4">
                <SimpleReportChart
                  kind="pie"
                  data={paymentChart}
                  emptyLabel={t("noPayments")}
                />
              </div>
              {(data.paymentsByMethod ?? []).length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {data.paymentsByMethod!.map((p) => (
                    <li
                      key={p.method}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-text-muted">
                        {p.label ?? paymentLabel(p.method) ?? p.method}
                      </span>
                      <span className="tabular-nums font-medium text-text">
                        {formatMoney(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card padding={false} className="overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  {t("topProducts")}
                </h2>
              </div>
              {(data.topProducts ?? []).length === 0 ? (
                <p className="px-5 py-8 text-sm text-text-muted">{t("noTopProducts")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                        <th className="px-5 py-2 font-semibold">{t("product")}</th>
                        <th className="px-3 py-2 text-right font-semibold">{t("qty")}</th>
                        <th className="px-5 py-2 text-right font-semibold">{t("revenue")}</th>
                        {canSeeCost ? (
                          <th className="px-5 py-2 text-right font-semibold">{t("profit")}</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts!.map((row, i) => (
                        <tr key={row.productId ?? `${row.name}-${i}`} className="border-b border-border last:border-0">
                          <td className="px-5 py-2.5 font-medium text-text">{row.name}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                            {row.quantity ?? "—"}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-text">
                            {row.revenue ? formatMoney(row.revenue) : "—"}
                          </td>
                          {canSeeCost ? (
                            <td className="px-5 py-2.5 text-right tabular-nums text-text">
                              {row.profit ? formatMoney(row.profit) : "—"}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  {t("needsAttention")}
                </h2>
                {needsAttention.length > 0 ? (
                  <Badge variant="warning">{needsAttention.length}</Badge>
                ) : null}
              </div>
              {needsAttention.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">{t("allClear")}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {needsAttention.map((item) => (
                    <li key={`${item.kind}-${item.href}`}>
                      <Link
                        href={item.href}
                        className={cn(
                          "tap flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm transition hover:border-primary/30 hover:bg-surface",
                        )}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-medium text-text">{item.title}</span>
                          <Badge variant={severityVariant(item.severity)}>
                            {item.count}
                          </Badge>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {t("open")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {data.productCount != null ? (
            <p className="text-sm text-text-muted">
              {t("productsTracked", { count: data.productCount })}
            </p>
          ) : null}
        </>
      ) : null}

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
