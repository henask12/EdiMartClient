import { parseApiMessage } from "@/lib/toast";
import { compareMoney, moneyString, subMoney } from "@/lib/pos-money";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  notes?: string | null;
  tags?: string[];
  creditLimit: string;
  creditBalance: string;
  storeCreditBalance: string;
  loyaltyPoints: number;
  loyaltyTier?: string | null;
  marketingOptOut?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerSaleSummary = {
  id: string;
  saleNumber: string;
  grandTotal?: string;
  total?: string;
  createdAt: string;
  status?: string;
};

export type CustomerProfile = Customer & {
  totalSpend?: string;
  averageBasket?: string;
  lastVisit?: string | null;
  favouriteCategories?: Array<{ id?: string; name: string; spend?: string }>;
  sales?: CustomerSaleSummary[];
  history?: CustomerSaleSummary[];
};

export type CustomerLedgerEntry = {
  id: string;
  customerId: string;
  kind: string;
  amount: string;
  balanceAfter: string;
  saleId?: string | null;
  creditNoteId?: string | null;
  notes?: string | null;
  createdByUserId?: string;
  createdAt: string;
  sale?: { id: string; saleNumber?: string } | null;
};

export type CustomerStatement = {
  customer?: Customer;
  customerId?: string;
  from?: string | null;
  to?: string | null;
  openingBalance?: string;
  closingBalance?: string;
  creditBalance?: string;
  storeCreditBalance?: string;
  entries?: CustomerLedgerEntry[];
  lines?: CustomerLedgerEntry[];
};

export type OverdueCustomer = Customer & {
  overdueAmount?: string;
  daysOverdue?: number;
};

export type LoyaltySettings = {
  pointsPerBirr: string;
  birrPerRedeemPoint: string;
  enabled: boolean;
  defaultCreditLimit: string;
};

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  pointsPerBirr: "0.1",
  birrPerRedeemPoint: "0.1",
  enabled: true,
  defaultCreditLimit: "0",
};

const asList = <T>(json: unknown): T[] => {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && Array.isArray((json as { items?: unknown }).items)) {
    return (json as { items: T[] }).items;
  }
  return [];
};

export const customersFetch = async (
  path: string,
  init?: RequestInit,
): Promise<Response> =>
  fetch(`/api/proxy${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

export const readError = async (res: Response, fallback: string) => {
  const data = await res.json().catch(() => ({}));
  return parseApiMessage(data, fallback);
};

/** Credit still available under the limit (limit − balance owed). */
export const creditAvailable = (customer: {
  creditLimit?: string | null;
  creditBalance?: string | null;
}): string => {
  const limit = customer.creditLimit ?? "0";
  const owed = customer.creditBalance ?? "0";
  const available = subMoney(limit, owed);
  return compareMoney(available, "0") > 0 ? available : "0.00";
};

export const listCustomers = async (q?: string): Promise<Customer[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  const res = await customersFetch(`/customers${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load customers"));
  return asList<Customer>(await res.json());
};

export const getCustomer = async (id: string): Promise<CustomerProfile> => {
  const res = await customersFetch(`/customers/${id}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load customer"));
  return (await res.json()) as CustomerProfile;
};

export const createCustomer = async (body: {
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  notes?: string;
  tags?: string[];
  creditLimit?: string;
}): Promise<Customer> => {
  const res = await customersFetch("/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create customer"));
  return (await res.json()) as Customer;
};

export const updateCustomer = async (
  id: string,
  body: Record<string, unknown>,
): Promise<Customer> => {
  const res = await customersFetch(`/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not update customer"));
  return (await res.json()) as Customer;
};

export const listOverdueCustomers = async (): Promise<OverdueCustomer[]> => {
  const res = await customersFetch("/customers/overdue");
  if (!res.ok) throw new Error(await readError(res, "Could not load overdue customers"));
  return asList<OverdueCustomer>(await res.json());
};

export const repayCustomer = async (
  id: string,
  body: { amount: string; method?: string; reference?: string; notes?: string },
): Promise<Customer> => {
  const res = await customersFetch(`/customers/${id}/repay`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not record repayment"));
  return (await res.json()) as Customer;
};

export const setCustomerCreditLimit = async (
  id: string,
  creditLimit: string,
): Promise<Customer> => {
  const res = await customersFetch(`/customers/${id}/credit-limit`, {
    method: "POST",
    body: JSON.stringify({ creditLimit }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not update credit limit"));
  return (await res.json()) as Customer;
};

export const getCustomerLedger = async (id: string): Promise<CustomerLedgerEntry[]> => {
  const res = await customersFetch(`/customers/${id}/ledger`);
  if (!res.ok) throw new Error(await readError(res, "Could not load ledger"));
  const json = await res.json();
  if (Array.isArray(json)) return json as CustomerLedgerEntry[];
  if (json && typeof json === "object") {
    const obj = json as { entries?: unknown; items?: unknown; lines?: unknown };
    if (Array.isArray(obj.entries)) return obj.entries as CustomerLedgerEntry[];
    if (Array.isArray(obj.items)) return obj.items as CustomerLedgerEntry[];
    if (Array.isArray(obj.lines)) return obj.lines as CustomerLedgerEntry[];
  }
  return [];
};

export const getCustomerStatement = async (id: string): Promise<CustomerStatement> => {
  const res = await customersFetch(`/customers/${id}/statement`);
  if (!res.ok) throw new Error(await readError(res, "Could not load statement"));
  return (await res.json()) as CustomerStatement;
};

export const parseLoyaltySettings = (
  api: Record<string, unknown> | null | undefined,
): LoyaltySettings => {
  const points =
    api?.["loyalty.pointsPerBirr"] ?? api?.pointsPerBirr ?? DEFAULT_LOYALTY_SETTINGS.pointsPerBirr;
  const birr =
    api?.["loyalty.birrPerRedeemPoint"] ??
    api?.birrPerRedeemPoint ??
    DEFAULT_LOYALTY_SETTINGS.birrPerRedeemPoint;
  const enabledRaw =
    api?.["loyalty.enabled"] ?? api?.loyaltyEnabled ?? String(DEFAULT_LOYALTY_SETTINGS.enabled);
  const credit =
    api?.["customers.defaultCreditLimit"] ??
    api?.defaultCreditLimit ??
    DEFAULT_LOYALTY_SETTINGS.defaultCreditLimit;
  const enabledStr = String(enabledRaw).toLowerCase();
  return {
    pointsPerBirr: String(points),
    birrPerRedeemPoint: String(birr),
    enabled: enabledStr === "true" || enabledStr === "1",
    defaultCreditLimit: String(credit),
  };
};

export const loyaltySettingsPatchBody = (s: LoyaltySettings): Record<string, string> => ({
  pointsPerBirr: s.pointsPerBirr,
  birrPerRedeemPoint: s.birrPerRedeemPoint,
  loyaltyEnabled: String(s.enabled),
  defaultCreditLimit: s.defaultCreditLimit,
  "loyalty.pointsPerBirr": s.pointsPerBirr,
  "loyalty.birrPerRedeemPoint": s.birrPerRedeemPoint,
  "loyalty.enabled": String(s.enabled),
  "customers.defaultCreditLimit": s.defaultCreditLimit,
});

/** Birr discount from redeeming N loyalty points (uses store rate). */
export const loyaltyRedeemValue = (points: number, birrPerRedeemPoint: string): string => {
  if (!points || points <= 0) return "0.00";
  const rate = Number(birrPerRedeemPoint);
  if (!Number.isFinite(rate) || rate <= 0) return "0.00";
  return moneyString(Math.round(points * rate * 100));
};
