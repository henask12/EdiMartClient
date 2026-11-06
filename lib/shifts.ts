import { addMoney, moneyString, mulMoney } from "@/lib/pos-money";
import { getStoredRegisterId, registerHeaders } from "@/lib/register-device";

export type Register = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};

export type ShiftUser = {
  id: string;
  displayName?: string | null;
  email?: string;
};

export type CashMovement = {
  id: string;
  type: "CASH_IN" | "CASH_OUT" | "NO_SALE_OPEN" | string;
  amount: string;
  reason?: string | null;
  createdAt: string;
  createdBy?: ShiftUser | null;
};

export type Shift = {
  id: string;
  shiftNumber: string;
  status: "OPEN" | "CLOSED" | string;
  registerId: string;
  register?: Register | null;
  openedByUserId?: string;
  openedBy?: ShiftUser | null;
  closedBy?: ShiftUser | null;
  openedAt: string;
  closedAt?: string | null;
  openingFloat: string;
  expectedCash?: string | null;
  countedCash?: string | null;
  variance?: string | null;
  notes?: string | null;
  cashMovements?: CashMovement[];
};

export type ShiftReport = {
  kind?: "X" | "Z" | string;
  shiftNumber?: string;
  registerCode?: string;
  openedAt?: string;
  closedAt?: string | null;
  cashierName?: string;
  openingFloat?: string;
  cashSales?: string;
  otherSales?: string;
  refunds?: string;
  voids?: string;
  discounts?: string;
  cashIn?: string;
  cashOut?: string;
  expectedCash?: string;
  countedCash?: string | null;
  variance?: string | null;
  vatTotal?: string;
  salesByMethod?: Array<{ method: string; amount: string; count?: number }>;
  [key: string]: unknown;
};

export type ShiftSettings = {
  requireOpenShift: boolean;
  varianceApprovalThreshold: string;
  eodEmailEnabled: boolean;
};

export const DEFAULT_SHIFT_SETTINGS: ShiftSettings = {
  requireOpenShift: true,
  varianceApprovalThreshold: "100",
  eodEmailEnabled: true,
};

/** Circulating ETB notes commonly counted in a till float. */
export const DEFAULT_DENOMS = ["1", "5", "10", "50", "100", "200"];

export type DenomCounts = Record<string, number>;

export const emptyDenomCounts = (denoms: string[]): DenomCounts =>
  Object.fromEntries(denoms.map((d) => [d, 0]));

export const totalFromDenoms = (counts: DenomCounts): string => {
  let total = "0.00";
  for (const [denom, qty] of Object.entries(counts)) {
    if (!qty) continue;
    total = addMoney(total, mulMoney(denom, qty));
  }
  return total;
};

export const denomsPayload = (counts: DenomCounts): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) out[k] = v;
  }
  return out;
};

const asList = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as { items?: T[]; data?: T[] };
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
};

const moneyField = (value: unknown, fallback = "0.00"): string => {
  if (value == null || value === "") return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return moneyString(Math.round(value * 100));
  return String(value);
};

export const normalizeShift = (raw: Record<string, unknown>): Shift => ({
  id: String(raw.id),
  shiftNumber: String(raw.shiftNumber ?? raw.number ?? ""),
  status: String(raw.status ?? "OPEN"),
  registerId: String(raw.registerId ?? (raw.register as Register | undefined)?.id ?? ""),
  register: (raw.register as Register | undefined) ?? null,
  openedByUserId: raw.openedByUserId ? String(raw.openedByUserId) : undefined,
  openedBy: (raw.openedBy as ShiftUser | undefined) ?? null,
  closedBy: (raw.closedBy as ShiftUser | undefined) ?? null,
  openedAt: String(raw.openedAt ?? ""),
  closedAt: raw.closedAt ? String(raw.closedAt) : null,
  openingFloat: moneyField(raw.openingFloat),
  expectedCash: raw.expectedCash != null ? moneyField(raw.expectedCash) : null,
  countedCash: raw.countedCash != null ? moneyField(raw.countedCash) : null,
  variance: raw.variance != null ? moneyField(raw.variance) : null,
  notes: raw.notes != null ? String(raw.notes) : null,
  cashMovements: Array.isArray(raw.cashMovements)
    ? (raw.cashMovements as CashMovement[]).map((m) => ({
        ...m,
        amount: moneyField(m.amount),
      }))
    : undefined,
});

export const parseShiftSettings = (
  api: Record<string, unknown> | null | undefined,
): ShiftSettings => {
  const reqRaw =
    api?.["shifts.requireOpenShift"] ?? api?.requireOpenShift ?? DEFAULT_SHIFT_SETTINGS.requireOpenShift;
  const eodRaw =
    api?.["shifts.eodEmailEnabled"] ?? api?.eodEmailEnabled ?? DEFAULT_SHIFT_SETTINGS.eodEmailEnabled;
  return {
    requireOpenShift: String(reqRaw) !== "false" && String(reqRaw) !== "0",
    varianceApprovalThreshold: String(
      api?.["shifts.varianceApprovalThreshold"] ??
        api?.varianceApprovalThreshold ??
        DEFAULT_SHIFT_SETTINGS.varianceApprovalThreshold,
    ),
    eodEmailEnabled: String(eodRaw) !== "false" && String(eodRaw) !== "0",
  };
};

export const shiftSettingsPatchBody = (s: ShiftSettings): Record<string, string> => ({
  requireOpenShift: String(s.requireOpenShift),
  varianceApprovalThreshold: s.varianceApprovalThreshold,
  eodEmailEnabled: String(s.eodEmailEnabled),
});

const withRegister = (extra?: HeadersInit): HeadersInit => ({
  ...registerHeaders(),
  ...(extra ?? {}),
});

export const fetchRegisters = async (): Promise<Register[]> => {
  const res = await fetch("/api/proxy/registers", {
    cache: "no-store",
    headers: withRegister(),
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return asList<Register>(data).filter((r) => r.isActive !== false);
};

export const fetchShifts = async (status?: "OPEN" | "CLOSED" | "ALL"): Promise<Shift[]> => {
  const q = status && status !== "ALL" ? `?status=${status}` : "";
  const res = await fetch(`/api/proxy/shifts${q}`, {
    cache: "no-store",
    headers: withRegister(),
  });
  if (!res.ok) throw new Error(`shifts ${res.status}`);
  const data = await res.json().catch(() => []);
  return asList<Record<string, unknown>>(data).map(normalizeShift);
};

export const fetchCurrentShift = async (): Promise<Shift | null> => {
  const registerId = getStoredRegisterId();
  const q = registerId ? `?registerId=${encodeURIComponent(registerId)}` : "";
  const res = await fetch(`/api/proxy/shifts/current${q}`, {
    cache: "no-store",
    headers: withRegister(),
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data === null) return null;
  if (typeof data === "object" && "shift" in data) {
    const shift = (data as { shift: unknown }).shift;
    if (!shift) return null;
    return normalizeShift(shift as Record<string, unknown>);
  }
  if (!(data as { id?: string }).id) return null;
  return normalizeShift(data as Record<string, unknown>);
};

export const fetchShift = async (id: string): Promise<Shift> => {
  const res = await fetch(`/api/proxy/shifts/${id}`, {
    cache: "no-store",
    headers: withRegister(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as { message?: string }).message ?? "Shift not found"));
  return normalizeShift(data as Record<string, unknown>);
};

export const openShift = async (body: {
  registerId: string;
  denominations: Record<string, number>;
  notes?: string;
}): Promise<Shift> => {
  const res = await fetch("/api/proxy/shifts/open", {
    method: "POST",
    headers: withRegister({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(String((data as { message?: string }).message ?? "Open failed")), {
      status: res.status,
      data,
    });
  }
  return normalizeShift(data as Record<string, unknown>);
};

export const postCashMovement = async (
  shiftId: string,
  type: "cash-in" | "cash-out" | "no-sale",
  body: { amount?: string; reason?: string },
  approvalToken?: string,
): Promise<unknown> => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...registerHeaders(),
  };
  if (approvalToken) headers["x-approval-token"] = approvalToken;
  const res = await fetch(`/api/proxy/shifts/${shiftId}/${type}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(String((data as { message?: string }).message ?? "Request failed")), {
      status: res.status,
      data,
      code: (data as { code?: string }).code,
      action: (data as { action?: string }).action,
    });
  }
  return data;
};

export const closeShift = async (
  shiftId: string,
  body: { denominations: Record<string, number>; notes?: string },
  approvalToken?: string,
): Promise<{ shift: Shift; needsApproval?: boolean; data: Record<string, unknown> }> => {
  const payload: Record<string, unknown> = { ...body };
  if (approvalToken) payload.approvalToken = approvalToken;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...registerHeaders(),
  };
  if (approvalToken) headers["x-approval-token"] = approvalToken;
  const res = await fetch(`/api/proxy/shifts/${shiftId}/close`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = String(data.code ?? "");
    if (code.includes("APPROVAL") || data.action === "SHIFT_VARIANCE_OVER_LIMIT") {
      return {
        shift: normalizeShift({ id: shiftId, shiftNumber: "", status: "OPEN", registerId: "", openedAt: "", openingFloat: "0" }),
        needsApproval: true,
        data,
      };
    }
    throw Object.assign(new Error(String(data.message ?? "Close failed")), {
      status: res.status,
      data,
      code: data.code,
      action: data.action,
    });
  }
  return {
    shift: normalizeShift(data),
    data,
  };
};

export const fetchShiftReport = async (
  shiftId: string,
  kind: "x-report" | "z-report",
): Promise<ShiftReport> => {
  const res = await fetch(`/api/proxy/shifts/${shiftId}/${kind}`, {
    cache: "no-store",
    headers: withRegister(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String((data as { message?: string }).message ?? "Report failed"));
  }

  const shift = (data.shift as Record<string, unknown> | undefined) ?? {};
  const register = (shift.register as Register | undefined) ?? undefined;
  const openedBy = (shift.openedBy as ShiftUser | undefined) ?? undefined;
  const sales = (data.sales as Record<string, unknown> | undefined) ?? {};
  const cash = (data.cashMovements as Record<string, unknown> | undefined) ?? {};
  const byMethod = (sales.byMethod as Record<string, string> | undefined) ?? {};
  const voids = (sales.voids as { total?: string } | undefined) ?? {};
  const refunds = (sales.refunds as { total?: string } | undefined) ?? {};

  return {
    kind: String(data.kind ?? (kind === "x-report" ? "X" : "Z")),
    shiftNumber: shift.shiftNumber != null ? String(shift.shiftNumber) : undefined,
    registerCode: register?.code,
    openedAt: shift.openedAt != null ? String(shift.openedAt) : undefined,
    closedAt: shift.closedAt != null ? String(shift.closedAt) : null,
    cashierName: openedBy?.displayName || openedBy?.email,
    openingFloat: data.openingFloat != null ? moneyField(data.openingFloat) : undefined,
    cashIn: cash.cashIn != null ? moneyField(cash.cashIn) : undefined,
    cashOut: cash.cashOut != null ? moneyField(cash.cashOut) : undefined,
    discounts: sales.discountTotal != null ? moneyField(sales.discountTotal) : undefined,
    vatTotal: sales.taxTotal != null ? moneyField(sales.taxTotal) : undefined,
    voids: voids.total != null ? moneyField(voids.total) : undefined,
    refunds: refunds.total != null ? moneyField(refunds.total) : undefined,
    expectedCash: data.expectedCash != null ? moneyField(data.expectedCash) : undefined,
    countedCash: data.countedCash != null ? moneyField(data.countedCash) : null,
    variance: data.variance != null ? moneyField(data.variance) : null,
    salesByMethod: Object.entries(byMethod).map(([method, amount]) => ({
      method,
      amount: moneyField(amount),
    })),
    ...data,
  };
};

export const openerName = (shift: Shift | null | undefined): string => {
  if (!shift) return "";
  return shift.openedBy?.displayName || shift.openedBy?.email || "Cashier";
};

/** Probe whether PIN quick-switch exists (Phase 5 optional). */
export const pinLoginAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetch("/api/proxy/auth/pin-login", { method: "OPTIONS" });
    return res.status !== 404;
  } catch {
    return false;
  }
};
