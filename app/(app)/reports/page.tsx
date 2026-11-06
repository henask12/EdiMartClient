"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { usePermission } from "@/components/PermissionProvider";
import { AccessDenied } from "@/components/AccessDenied";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PeriodPresetBar } from "@/components/reporting/PeriodPresetBar";
import { SimpleReportChart } from "@/components/reporting/SimpleReportChart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { toDateInput } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import { permissionName } from "@/lib/permissions";
import {
  REPORT_DEFINITIONS,
  chartSeriesFromRows,
  downloadReportCsv,
  fetchReport,
  humanizeColumn,
  inferColumns,
  isMoneyColumn,
  reportById,
  resolvePresetRange,
  type ReportDefinition,
  type ReportGroup,
  type ReportPreset,
  type ReportResult,
} from "@/lib/reporting";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";

const GROUPS: { id: ReportGroup; labelKey: string }[] = [
  { id: "sales", labelKey: "groupSales" },
  { id: "inventory", labelKey: "groupInventory" },
  { id: "purchasing", labelKey: "groupPurchasing" },
];

const DEFAULT_REPORT = "sales-by-day";

const cellValue = (key: string, value: unknown): string => {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isMoneyColumn(key)) return formatMoney(String(value));
  return String(value);
};

const ReportsHub = () => {
  const t = useTranslations("Reports");
  const { can, canSeeCost } = usePermission();
  const router = useRouter();
  const searchParams = useSearchParams();

  const reportId = searchParams.get("report") || DEFAULT_REPORT;
  const def = reportById(reportId) ?? reportById(DEFAULT_REPORT)!;

  const [preset, setPreset] = useState<ReportPreset>("this_month");
  const [from, setFrom] = useState(() => resolvePresetRange("this_month").from);
  const [to, setTo] = useState(() => resolvePresetRange("this_month").to);
  const [customApplied, setCustomApplied] = useState({ from: "", to: "" });
  const [groupBy, setGroupBy] = useState("product");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => {
    if (preset === "custom") {
      return resolvePresetRange("custom", {
        from: customApplied.from || from,
        to: customApplied.to || to,
      });
    }
    return resolvePresetRange(preset);
  }, [preset, customApplied, from, to]);

  const setReport = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", id);
    router.replace(`/reports?${params.toString()}`);
  };

  const load = useCallback(
    async (reportDef: ReportDefinition) => {
      setLoading(true);
      try {
        const extra =
          reportDef.id === "sales-by-product" ? { groupBy } : undefined;
        const payload = await fetchReport(reportDef, {
          preset,
          from: range.from,
          to: range.to,
          extra,
        });
        setResult(payload);
      } catch (e) {
        toastError(e instanceof Error ? e.message : t("loadFailed"));
        setResult({ rows: [], unavailable: true });
      } finally {
        setLoading(false);
      }
    },
    [preset, range.from, range.to, groupBy, t],
  );

  useEffect(() => {
    if (!can("REPORTING_VIEW")) return;
    void load(def);
  }, [can, def, load]);

  if (!can("REPORTING_VIEW")) {
    return <AccessDenied needs={[permissionName("REPORTING_VIEW")]} />;
  }

  const hideCost = !canSeeCost;
  const columns = inferColumns(result?.rows ?? [], {
    hideCost,
    costColumns: def.costColumns,
  });
  const tableColumns: DataTableColumn<Record<string, unknown>>[] = columns.map(
    (key) => ({
      key,
      header: humanizeColumn(key),
      className: isMoneyColumn(key) ? "text-right" : undefined,
      render: (row) => (
        <span className={cn(isMoneyColumn(key) && "tabular-nums")}>
          {cellValue(key, row[key])}
        </span>
      ),
    }),
  );

  const chartData = chartSeriesFromRows(result?.rows ?? [], result?.chart);
  const showChart = def.chart && def.chart !== "none" && !result?.unavailable;

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadReportCsv(def, {
        preset,
        from: range.from,
        to: range.to,
        extra: def.id === "sales-by-product" ? { groupBy } : undefined,
      });
      toastSuccess(t("exportStarted"));
    } catch {
      toastError(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const handlePresetChange = (next: ReportPreset) => {
    setPreset(next);
    if (next !== "custom") {
      const r = resolvePresetRange(next);
      setFrom(r.from);
      setTo(r.to);
    } else if (!from) {
      const today = toDateInput(new Date());
      setFrom(today);
      setTo(today);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button
            size="sm"
            variant="secondary"
            disabled={exporting || !!result?.unavailable}
            onClick={() => void handleExport()}
            icon={<Download className="size-4" />}
          >
            {t("exportCsv")}
          </Button>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <Card className="space-y-4">
            {GROUPS.map((g) => {
              const items = REPORT_DEFINITIONS.filter((r) => r.group === g.id);
              return (
                <div key={g.id}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
                    {t(g.labelKey)}
                  </p>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const active = item.id === def.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setReport(item.id)}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition focus-ring",
                              active
                                ? "bg-primary-soft text-primary"
                                : "text-text-muted hover:bg-surface-muted hover:text-text",
                            )}
                            aria-current={active ? "page" : undefined}
                          >
                            {t(item.labelKey)}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </Card>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">{t(def.labelKey)}</h2>
                <p className="text-sm text-text-muted">
                  {range.from === range.to
                    ? range.from
                    : `${range.from} → ${range.to}`}
                </p>
              </div>
              {def.id === "sales-by-product" ? (
                <Select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  aria-label={t("groupBy")}
                  className="w-full sm:w-44"
                >
                  <option value="product">{t("byProduct")}</option>
                  <option value="category">{t("byCategory")}</option>
                  <option value="type">{t("byType")}</option>
                  <option value="brand">{t("byBrand")}</option>
                </Select>
              ) : null}
            </div>

            <PeriodPresetBar
              preset={preset}
              from={from}
              to={to}
              onPresetChange={handlePresetChange}
              onFromChange={setFrom}
              onToChange={setTo}
              onApplyCustom={() => setCustomApplied({ from, to })}
            />
          </Card>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : result?.unavailable ? (
            <Card>
              <p className="text-sm text-text-muted">{t("unavailable")}</p>
            </Card>
          ) : (
            <>
              {showChart ? (
                <Card>
                  <SimpleReportChart
                    kind={def.chart === "line" ? "bar" : def.chart}
                    data={chartData}
                    emptyLabel={t("noChartData")}
                  />
                </Card>
              ) : null}

              <Card padding={false} className="overflow-hidden">
                <div className="border-b border-border px-5 py-3 text-sm font-medium text-text">
                  {t("rows", { count: result?.rows.length ?? 0 })}
                </div>
                <div className="p-4">
                  <DataTable
                    columns={tableColumns}
                    rows={(result?.rows ?? []).map((row, i) => ({
                      ...row,
                      __rowKey: String(row.id ?? row.productId ?? row.sku ?? i),
                    }))}
                    rowKey={(row) => String(row.__rowKey)}
                    emptyMessage={t("noRows")}
                  />
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <ReportsHub />
    </Suspense>
  );
}
