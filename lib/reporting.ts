import { downloadExport } from "@/lib/export-download";
import { toDateInput } from "@/lib/date-helpers";

/** Date presets accepted by Phase 8 reporting endpoints. */
export type ReportPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

export const REPORT_PRESETS: { value: ReportPreset; labelKey: string }[] = [
  { value: "today", labelKey: "today" },
  { value: "yesterday", labelKey: "yesterday" },
  { value: "this_week", labelKey: "thisWeek" },
  { value: "this_month", labelKey: "thisMonth" },
  { value: "last_month", labelKey: "lastMonth" },
  { value: "custom", labelKey: "custom" },
];

export type PeriodSummary = {
  grandTotal: string;
  saleCount: number;
  netProfit?: string;
  averageBasket?: string;
  deltaPct?: number | null;
};

export type DashboardKpi = {
  key: string;
  label?: string;
  value: string | number;
  deltaPct?: number | null;
  previous?: string | number | null;
};

export type SalesByHourPoint = {
  hour: number;
  label?: string;
  sales?: string | number;
  amount?: string | number;
  count?: number;
  avgSameWeekday?: string | number | null;
};

export type PaymentMethodSlice = {
  method: string;
  label?: string;
  amount: string;
  count?: number;
  pct?: number | null;
};

export type TopProductRow = {
  productId?: string;
  name: string;
  sku?: string | null;
  quantity?: string | number;
  revenue?: string;
  profit?: string;
};

export type NeedsAttentionItem = {
  kind: string;
  severity?: "info" | "warning" | "danger" | string;
  title: string;
  count: number;
  href: string;
};

export type DashboardPayload = {
  businessDate?: string;
  preset?: ReportPreset;
  from?: string;
  to?: string;
  kpis?: DashboardKpi[];
  sales?: PeriodSummary & { deltaPct?: number | null };
  profit?: PeriodSummary & { deltaPct?: number | null };
  transactions?: { value: number; deltaPct?: number | null };
  averageBasket?: { value: string; deltaPct?: number | null };
  salesByHour?: SalesByHourPoint[];
  paymentsByMethod?: PaymentMethodSlice[];
  topProducts?: TopProductRow[];
  needsAttention?: NeedsAttentionItem[];
  /** Legacy fields still returned by current API */
  today?: PeriodSummary;
  week?: PeriodSummary;
  month?: PeriodSummary;
  year?: PeriodSummary;
  needsRestock?: Array<{
    id: string;
    name: string;
    available: string;
    restockQty: number;
    status: "OUT" | "LOW";
  }>;
  expiringSoon?: Array<{
    id: string;
    productName: string;
    qtyRemaining: string;
    expiryDate: string | null;
  }>;
  openReservations?: Array<{
    id: string;
    productName: string;
    quantity: string;
    customerName: string | null;
  }>;
  productCount?: number;
  stockValue?: string;
};

export type InventoryDashboardPayload = {
  turnover?: string | number | null;
  daysOfInventory?: string | number | null;
  doi?: string | number | null;
  abcSplit?: Array<{ class: string; skuCount?: number; valueShare?: number; revenueShare?: number }>;
  abc?: { A?: number; B?: number; C?: number };
  shrinkageThisMonth?: string | null;
  shrinkage?: string | null;
  accuracyPct?: number | null;
  inventoryAccuracyPct?: number | null;
  deadStockValue?: string | null;
  overstockValue?: string | null;
  skuCount?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  valueAtCost?: string | null;
  valueAtRetail?: string | null;
};

export type ReportGroup = "sales" | "inventory" | "purchasing";

export type ReportDefinition = {
  id: string;
  group: ReportGroup;
  path: string;
  labelKey: string;
  chart?: "bar" | "line" | "pie" | "none";
  /** Optional extra query keys (e.g. groupBy for sales-by-product). */
  defaultQuery?: Record<string, string>;
  costColumns?: string[];
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: "sales-by-day", group: "sales", path: "reporting/sales-by-day", labelKey: "salesByDay", chart: "bar" },
  { id: "sales-by-hour", group: "sales", path: "reporting/sales-by-hour", labelKey: "salesByHour", chart: "bar" },
  {
    id: "sales-by-product",
    group: "sales",
    path: "reporting/sales-by-product",
    labelKey: "salesByProduct",
    chart: "bar",
    defaultQuery: { groupBy: "product" },
    costColumns: ["profit", "cost", "margin", "marginPct"],
  },
  { id: "sales-by-cashier", group: "sales", path: "reporting/sales-by-cashier", labelKey: "salesByCashier", chart: "bar" },
  { id: "sales-by-payment", group: "sales", path: "reporting/sales-by-payment", labelKey: "salesByPayment", chart: "pie" },
  {
    id: "discounts-voids-refunds",
    group: "sales",
    path: "reporting/discounts-voids-refunds",
    labelKey: "discountsVoidsRefunds",
    chart: "none",
  },
  { id: "customers", group: "sales", path: "reporting/customers", labelKey: "customers", chart: "none" },
  { id: "vat-summary", group: "sales", path: "reporting/vat-summary", labelKey: "vatSummary", chart: "none" },
  { id: "shift-variances", group: "sales", path: "reporting/shift-variances", labelKey: "shiftVariances", chart: "none" },
  { id: "stock-on-hand", group: "inventory", path: "reporting/stock-on-hand", labelKey: "stockOnHand", chart: "none", costColumns: ["costValue", "valueAtCost"] },
  { id: "valuation", group: "inventory", path: "reporting/valuation", labelKey: "valuation", chart: "none", costColumns: ["costValue", "valueAtCost", "margin"] },
  { id: "movements", group: "inventory", path: "reporting/movements", labelKey: "movements", chart: "none" },
  { id: "abc", group: "inventory", path: "reporting/abc", labelKey: "abc", chart: "pie", costColumns: ["profit"] },
  { id: "turnover", group: "inventory", path: "reporting/turnover", labelKey: "turnover", chart: "bar" },
  { id: "dead-stock", group: "inventory", path: "reporting/dead-stock", labelKey: "deadStock", chart: "none", costColumns: ["costValue", "valueAtCost"] },
  { id: "overstock", group: "inventory", path: "reporting/overstock", labelKey: "overstock", chart: "none", costColumns: ["costValue"] },
  { id: "shrinkage", group: "inventory", path: "reporting/shrinkage", labelKey: "shrinkage", chart: "bar", costColumns: ["costValue", "value"] },
  { id: "expiry-losses", group: "inventory", path: "reporting/expiry-losses", labelKey: "expiryLosses", chart: "bar", costColumns: ["costValue", "lossValue"] },
  { id: "margin-alerts", group: "inventory", path: "reporting/margin-alerts", labelKey: "marginAlerts", chart: "none", costColumns: ["cost", "margin", "marginPct", "profit"] },
  { id: "purchases-by-supplier", group: "purchasing", path: "reporting/purchases-by-supplier", labelKey: "purchasesBySupplier", chart: "bar" },
  { id: "open-pos", group: "purchasing", path: "reporting/open-pos", labelKey: "openPos", chart: "none" },
  { id: "aged-payables", group: "purchasing", path: "reporting/aged-payables", labelKey: "agedPayables", chart: "bar" },
  { id: "landed-cost", group: "purchasing", path: "reporting/landed-cost", labelKey: "landedCost", chart: "none" },
];

export const reportById = (id: string) => REPORT_DEFINITIONS.find((r) => r.id === id);

export type DateRange = { from: string; to: string };

const shiftDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

const startOfWeekMonday = (isoDate: string) => {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateInput(d);
};

const startOfMonth = (isoDate: string) => `${isoDate.slice(0, 7)}-01`;

const endOfMonth = (isoDate: string) => {
  const d = new Date(`${isoDate.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toDateInput(d);
};

/** Resolve preset → inclusive YYYY-MM-DD range in business calendar (local Addis display date). */
export const resolvePresetRange = (
  preset: ReportPreset,
  custom?: Partial<DateRange>,
  anchor = new Date(),
): DateRange => {
  const today = toDateInput(anchor);
  if (preset === "custom") {
    return {
      from: custom?.from || today,
      to: custom?.to || today,
    };
  }
  if (preset === "today") return { from: today, to: today };
  if (preset === "yesterday") {
    const y = shiftDays(today, -1);
    return { from: y, to: y };
  }
  if (preset === "this_week") {
    return { from: startOfWeekMonday(today), to: today };
  }
  if (preset === "this_month") {
    return { from: startOfMonth(today), to: today };
  }
  // last_month
  const firstThisMonth = startOfMonth(today);
  const lastDayPrev = shiftDays(firstThisMonth, -1);
  return { from: startOfMonth(lastDayPrev), to: endOfMonth(lastDayPrev) };
};

export const buildReportingQuery = (opts: {
  preset: ReportPreset;
  from?: string;
  to?: string;
  extra?: Record<string, string | undefined>;
  format?: "csv";
}) => {
  const params = new URLSearchParams();
  params.set("preset", opts.preset);
  if (opts.preset === "custom") {
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
  }
  if (opts.format) params.set("format", opts.format);
  for (const [k, v] of Object.entries(opts.extra ?? {})) {
    if (v) params.set(k, v);
  }
  return params;
};

export class ReportingHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const proxyGet = async <T>(path: string, query?: URLSearchParams): Promise<T | null> => {
  const qs = query?.toString();
  const url = qs ? `/api/proxy/${path}?${qs}` : `/api/proxy/${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ReportingHttpError(res.status, message);
  }
  return (await res.json()) as T;
};

export const fetchDashboard = async (opts: {
  preset: ReportPreset;
  from?: string;
  to?: string;
}) => {
  const query = buildReportingQuery(opts);
  return proxyGet<DashboardPayload>("reporting/dashboard", query);
};

export const fetchInventoryDashboard = async () =>
  proxyGet<InventoryDashboardPayload>("reporting/inventory-dashboard");

export type ReportResult = {
  rows: Record<string, unknown>[];
  columns?: string[];
  chart?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  unavailable?: boolean;
};

const asRows = (payload: unknown): Record<string, unknown>[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["rows", "items", "data", "results", "lines"]) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
  }
  return [obj];
};

const asChart = (payload: unknown): Array<Record<string, unknown>> | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.chart)) return obj.chart as Array<Record<string, unknown>>;
  if (Array.isArray(obj.series)) return obj.series as Array<Record<string, unknown>>;
  return undefined;
};

export const fetchReport = async (
  def: ReportDefinition,
  opts: { preset: ReportPreset; from?: string; to?: string; extra?: Record<string, string | undefined> },
): Promise<ReportResult> => {
  const query = buildReportingQuery({
    ...opts,
    extra: { ...def.defaultQuery, ...opts.extra },
  });
  try {
    const payload = await proxyGet<unknown>(def.path, query);
    if (payload == null) return { rows: [], unavailable: true };
    return {
      rows: asRows(payload),
      chart: asChart(payload) ?? (Array.isArray(payload) ? undefined : undefined),
      summary:
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? ((payload as { summary?: Record<string, unknown> }).summary ?? undefined)
          : undefined,
    };
  } catch (e) {
    if (e instanceof ReportingHttpError && e.status === 404) {
      return { rows: [], unavailable: true };
    }
    throw e;
  }
};

export const downloadReportCsv = async (
  def: ReportDefinition,
  opts: { preset: ReportPreset; from?: string; to?: string; extra?: Record<string, string | undefined> },
) => {
  const query = buildReportingQuery({
    ...opts,
    format: "csv",
    extra: { ...def.defaultQuery, ...opts.extra },
  });
  await downloadExport(`/api/proxy/${def.path}?${query.toString()}`);
};

/** Build KPI cards from new or legacy dashboard payload. */
export const dashboardKpis = (
  data: DashboardPayload,
  opts: { includeProfit: boolean; preset: ReportPreset },
): DashboardKpi[] => {
  if (data.kpis && data.kpis.length > 0) {
    return data.kpis.filter((k) => opts.includeProfit || (k.key !== "profit" && k.key !== "netProfit"));
  }

  const periodKey =
    opts.preset === "this_week"
      ? "week"
      : opts.preset === "this_month" || opts.preset === "last_month"
        ? "month"
        : "today";
  const summary = data[periodKey] ?? data.today;
  if (!summary && !data.sales) return [];

  const salesValue = data.sales?.grandTotal ?? summary?.grandTotal ?? "0";
  const salesDelta = data.sales?.deltaPct ?? summary?.deltaPct ?? null;
  const txn = data.transactions?.value ?? summary?.saleCount ?? 0;
  const txnDelta = data.transactions?.deltaPct ?? null;
  const basket =
    data.averageBasket?.value ??
    summary?.averageBasket ??
    (summary && summary.saleCount > 0
      ? String(Number(summary.grandTotal) / summary.saleCount)
      : "0");
  const basketDelta = data.averageBasket?.deltaPct ?? null;
  const profitValue = data.profit?.grandTotal ?? data.profit?.netProfit ?? summary?.netProfit;
  const profitDelta = data.profit?.deltaPct ?? null;

  const kpis: DashboardKpi[] = [
    { key: "sales", label: "Sales", value: salesValue, deltaPct: salesDelta },
    { key: "transactions", label: "Transactions", value: txn, deltaPct: txnDelta },
    { key: "averageBasket", label: "Average basket", value: basket, deltaPct: basketDelta },
  ];
  if (opts.includeProfit && profitValue != null) {
    kpis.splice(1, 0, {
      key: "profit",
      label: "Profit",
      value: profitValue,
      deltaPct: profitDelta,
    });
  }
  return kpis;
};

/** Prefer API needsAttention; otherwise synthesize from legacy lists. */
export const dashboardNeedsAttention = (data: DashboardPayload): NeedsAttentionItem[] => {
  if (data.needsAttention && data.needsAttention.length > 0) return data.needsAttention;

  const items: NeedsAttentionItem[] = [];
  const out = (data.needsRestock ?? []).filter((r) => r.status === "OUT").length;
  const low = (data.needsRestock ?? []).filter((r) => r.status === "LOW").length;
  if (out > 0) {
    items.push({
      kind: "out_of_stock",
      severity: "danger",
      title: "Out of stock",
      count: out,
      href: "/inventory",
    });
  }
  if (low > 0) {
    items.push({
      kind: "low_stock",
      severity: "warning",
      title: "Low stock",
      count: low,
      href: "/inventory",
    });
  }
  if ((data.expiringSoon ?? []).length > 0) {
    items.push({
      kind: "expiring",
      severity: "warning",
      title: "Expiring batches",
      count: data.expiringSoon!.length,
      href: "/expiry",
    });
  }
  if ((data.openReservations ?? []).length > 0) {
    items.push({
      kind: "reservations",
      severity: "info",
      title: "Open reservations",
      count: data.openReservations!.length,
      href: "/reservations",
    });
  }
  return items;
};

export const formatDeltaPct = (delta: number | null | undefined): string | null => {
  if (delta == null || Number.isNaN(delta)) return null;
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
};

export const moneyishKeys = new Set([
  "amount",
  "sales",
  "revenue",
  "total",
  "grandTotal",
  "subtotal",
  "value",
  "cost",
  "costValue",
  "valueAtCost",
  "valueAtRetail",
  "retailValue",
  "profit",
  "netProfit",
  "margin",
  "discount",
  "discounts",
  "voids",
  "refunds",
  "vat",
  "vatAmount",
  "taxable",
  "averageBasket",
  "unitPrice",
  "unitCost",
  "lineTotal",
  "lossValue",
  "variance",
  "expectedCash",
  "countedCash",
]);

export const isMoneyColumn = (key: string) => {
  const k = key.toLowerCase();
  if (moneyishKeys.has(key) || moneyishKeys.has(k)) return true;
  return /(amount|total|revenue|sales|cost|profit|value|price|vat|margin|discount|refund|void)/i.test(
    key,
  ) && !/(pct|percent|count|qty|quantity|rate|days|doi|sku)/i.test(key);
};

export const humanizeColumn = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const inferColumns = (
  rows: Record<string, unknown>[],
  opts?: { hideCost?: boolean; costColumns?: string[] },
): string[] => {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]).filter((k) => {
    if (k === "id" || k === "productId" || k === "href") return false;
    if (opts?.hideCost && opts.costColumns?.includes(k)) return false;
    if (opts?.hideCost && /cost|profit|margin/i.test(k)) return false;
    const v = rows[0][k];
    return v == null || ["string", "number", "boolean"].includes(typeof v);
  });
  return keys;
};

export const chartSeriesFromRows = (
  rows: Record<string, unknown>[],
  chartRows?: Array<Record<string, unknown>>,
): Array<{ name: string; value: number }> => {
  const source = chartRows && chartRows.length > 0 ? chartRows : rows;
  return source.slice(0, 24).map((row, i) => {
    const name = String(
      row.label ?? row.name ?? row.method ?? row.day ?? row.date ?? row.hour ?? row.cashier ?? `#${i + 1}`,
    );
    const raw =
      row.value ?? row.amount ?? row.sales ?? row.revenue ?? row.total ?? row.count ?? row.qty ?? 0;
    const value = typeof raw === "number" ? raw : Number(raw);
    return { name, value: Number.isFinite(value) ? value : 0 };
  });
};
