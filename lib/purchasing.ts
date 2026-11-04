import { parseApiMessage } from "@/lib/toast";

/** Purchase order statuses from the Phase 6 API. */
export type PoStatus =
  | "DRAFT"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CLOSED"
  | "CANCELLED";

export type BillStatus = "OPEN" | "PARTIAL" | "PAID" | "VOID";
export type ReturnStatus = "DRAFT" | "SENT" | "COMPLETED" | "CANCELLED";

export type Supplier = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  telegram?: string | null;
  email?: string | null;
  address?: string | null;
  tin?: string | null;
  paymentTerms?: string | null;
  leadTimeDays: number;
  minimumOrder: string;
  currency?: string;
  notes?: string | null;
  isActive: boolean;
  products?: SupplierProductLink[];
};

export type SupplierProductLink = {
  id: string;
  productId: string;
  supplierSku?: string | null;
  packSize: number;
  lastCost?: string;
  isPreferred?: boolean;
  product?: { id: string; name: string; sku?: string | null };
};

export type PurchaseOrderLine = {
  id: string;
  productId: string;
  quantityOrdered: string;
  quantityReceived: string;
  unitCost?: string;
  lineTotal?: string;
  product?: { id: string; name: string; sku?: string | null };
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: PoStatus;
  supplierId: string;
  supplier?: { id: string; name: string; phone?: string | null; tin?: string | null };
  notes?: string | null;
  expectedAt?: string | null;
  subtotal?: string;
  createdAt: string;
  approvedAt?: string | null;
  sentAt?: string | null;
  closedAt?: string | null;
  lines?: PurchaseOrderLine[];
  receipts?: Array<{ id: string; receiptNumber: string; receivedAt: string }>;
};

export type GoodsReceiptLineInput = {
  purchaseOrderLineId?: string;
  productId: string;
  quantity: string;
  unitCost: string;
  locationId: string;
  expiryDate?: string;
  lotNumber?: string;
};

export type ReorderSuggestion = {
  productId: string;
  productName: string;
  sku?: string | null;
  supplierId: string;
  supplierName: string;
  available: string;
  incoming: string;
  avgDailySales?: string;
  daysOfCover?: string | null;
  suggestedQty: string;
  unitCost?: string;
  leadTimeDays?: number;
  maxStock?: number | null;
  restockQty?: number | null;
};

export type SupplierBill = {
  id: string;
  billNumber: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  purchaseOrderId?: string | null;
  supplierInvoiceRef?: string | null;
  status: BillStatus;
  amountDue: string;
  amountPaid: string;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  receipts?: Array<{ goodsReceiptId: string; goodsReceipt?: { receiptNumber: string } }>;
  payments?: Array<{ id: string; amount: string; method: string; paidAt: string; reference?: string | null }>;
};

export type AgedPayables = {
  current?: string;
  days1to30?: string;
  days31to60?: string;
  days61to90?: string;
  over90?: string;
  total?: string;
  buckets?: Array<{ label: string; amount: string }>;
};

export type SupplierReturn = {
  id: string;
  returnNumber: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  status: ReturnStatus;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
  lines?: Array<{
    id: string;
    productId: string;
    quantity: string;
    unitCost?: string;
    locationId: string;
    product?: { name: string };
  }>;
};

export type ProductOption = { id: string; name: string; sku?: string | null; costPrice?: string };
export type LocationOption = { id: string; code: string; name: string; sellable: boolean };

const asList = <T>(json: unknown): T[] => {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && Array.isArray((json as { items?: unknown }).items)) {
    return (json as { items: T[] }).items;
  }
  return [];
};

export const purchasingFetch = async (
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

export const listSuppliers = async (q?: string): Promise<Supplier[]> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  const res = await purchasingFetch(`/suppliers${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load suppliers"));
  return asList<Supplier>(await res.json());
};

export const getSupplier = async (id: string): Promise<Supplier> => {
  const res = await purchasingFetch(`/suppliers/${id}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load supplier"));
  return (await res.json()) as Supplier;
};

export const createSupplier = async (body: Record<string, unknown>): Promise<Supplier> => {
  const res = await purchasingFetch("/suppliers", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await readError(res, "Could not create supplier"));
  return (await res.json()) as Supplier;
};

export const updateSupplier = async (id: string, body: Record<string, unknown>): Promise<Supplier> => {
  const res = await purchasingFetch(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not update supplier"));
  return (await res.json()) as Supplier;
};

export const linkSupplierProduct = async (
  supplierId: string,
  body: { productId: string; lastCost?: string; supplierSku?: string; isPreferred?: boolean },
): Promise<SupplierProductLink> => {
  const res = await purchasingFetch(`/suppliers/${supplierId}/products`, {
    method: "POST",
    body: JSON.stringify({ packSize: 1, ...body }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not link product"));
  return (await res.json()) as SupplierProductLink;
};

export const listPurchaseOrders = async (status?: string): Promise<PurchaseOrder[]> => {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);
  const qs = params.toString();
  const res = await purchasingFetch(`/purchase-orders${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load purchase orders"));
  return asList<PurchaseOrder>(await res.json());
};

export const getPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
  const res = await purchasingFetch(`/purchase-orders/${id}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load purchase order"));
  return (await res.json()) as PurchaseOrder;
};

export const createPurchaseOrder = async (body: {
  supplierId: string;
  notes?: string;
  expectedAt?: string;
  lines: Array<{ productId: string; quantity: string; unitCost: string }>;
}): Promise<PurchaseOrder> => {
  const res = await purchasingFetch("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create purchase order"));
  return (await res.json()) as PurchaseOrder;
};

export const updatePurchaseOrder = async (
  id: string,
  body: Record<string, unknown>,
): Promise<PurchaseOrder> => {
  const res = await purchasingFetch(`/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not update purchase order"));
  return (await res.json()) as PurchaseOrder;
};

export const poAction = async (
  id: string,
  action: "approve" | "send" | "cancel" | "close",
): Promise<PurchaseOrder> => {
  const res = await purchasingFetch(`/purchase-orders/${id}/${action}`, { method: "POST" });
  if (!res.ok) throw new Error(await readError(res, `Could not ${action} purchase order`));
  return (await res.json()) as PurchaseOrder;
};

export const postGoodsReceipt = async (body: {
  purchaseOrderId: string;
  notes?: string;
  lines: GoodsReceiptLineInput[];
}): Promise<{ id: string; receiptNumber: string }> => {
  const res = await purchasingFetch("/goods-receipts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not post goods receipt"));
  return (await res.json()) as { id: string; receiptNumber: string };
};

export const postLandedCosts = async (
  receiptId: string,
  body: {
    charges: Array<{ kind: string; amount: string; description?: string; allocateBy?: string }>;
  },
): Promise<unknown> => {
  const res = await purchasingFetch(`/goods-receipts/${receiptId}/landed-costs`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not apply landed costs"));
  return res.json();
};

export const fetchReorderSuggestions = async (): Promise<ReorderSuggestion[]> => {
  const res = await purchasingFetch("/purchasing/reorder-suggestions");
  if (!res.ok) throw new Error(await readError(res, "Could not load reorder suggestions"));
  return asList<ReorderSuggestion>(await res.json());
};

export const createPosFromReorder = async (
  groups: Array<{
    supplierId: string;
    lines: Array<{ productId: string; quantity: string; unitCost?: string }>;
  }>,
): Promise<PurchaseOrder[]> => {
  const res = await purchasingFetch("/purchasing/reorder-suggestions/create-pos", {
    method: "POST",
    body: JSON.stringify({ groups }),
  });
  if (!res.ok) {
    // Fallback shape: single supplier payload
    if (groups.length === 1) {
      const one = groups[0];
      const retry = await purchasingFetch("/purchasing/reorder-suggestions/create-pos", {
        method: "POST",
        body: JSON.stringify({
          supplierId: one.supplierId,
          lines: one.lines,
        }),
      });
      if (!retry.ok) throw new Error(await readError(retry, "Could not create draft POs"));
      const json = await retry.json();
      return asList<PurchaseOrder>(json).length ? asList(json) : [json as PurchaseOrder];
    }
    throw new Error(await readError(res, "Could not create draft POs"));
  }
  const json = await res.json();
  return asList<PurchaseOrder>(json).length ? asList(json) : [json as PurchaseOrder];
};

export const listSupplierBills = async (status?: string): Promise<SupplierBill[]> => {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);
  const qs = params.toString();
  const res = await purchasingFetch(`/supplier-bills${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load supplier bills"));
  return asList<SupplierBill>(await res.json());
};

export const createSupplierBill = async (body: {
  supplierId: string;
  purchaseOrderId?: string;
  goodsReceiptIds?: string[];
  amountDue: string;
  dueDate?: string;
  supplierInvoiceRef?: string;
  notes?: string;
}): Promise<SupplierBill> => {
  const res = await purchasingFetch("/supplier-bills", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create bill"));
  return (await res.json()) as SupplierBill;
};

export const recordBillPayment = async (
  billId: string,
  body: { amount: string; method?: string; reference?: string },
): Promise<SupplierBill> => {
  const res = await purchasingFetch(`/supplier-bills/${billId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not record payment"));
  return (await res.json()) as SupplierBill;
};

export const fetchAgedPayables = async (): Promise<AgedPayables> => {
  // API exposes `/supplier-bills/aged-payables` (Phase 6).
  const res = await purchasingFetch("/supplier-bills/aged-payables");
  if (!res.ok) {
    const alt = await purchasingFetch("/supplier-bills/aged");
    if (!alt.ok) throw new Error(await readError(res, "Could not load aged payables"));
    return (await alt.json()) as AgedPayables;
  }
  return (await res.json()) as AgedPayables;
};

export const listSupplierReturns = async (): Promise<SupplierReturn[]> => {
  const res = await purchasingFetch("/supplier-returns");
  if (!res.ok) throw new Error(await readError(res, "Could not load supplier returns"));
  return asList<SupplierReturn>(await res.json());
};

export const createSupplierReturn = async (body: {
  supplierId: string;
  reason?: string;
  notes?: string;
  lines: Array<{
    productId: string;
    quantity: string;
    unitCost?: string;
    locationId: string;
    stockBatchId?: string;
  }>;
}): Promise<SupplierReturn> => {
  const res = await purchasingFetch("/supplier-returns", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create return"));
  return (await res.json()) as SupplierReturn;
};

export const completeSupplierReturn = async (id: string): Promise<SupplierReturn> => {
  const res = await purchasingFetch(`/supplier-returns/${id}/complete`, { method: "POST" });
  if (!res.ok) throw new Error(await readError(res, "Could not complete return"));
  return (await res.json()) as SupplierReturn;
};

export const fetchIncoming = async (productId: string): Promise<string> => {
  const res = await purchasingFetch(`/purchasing/incoming?productId=${encodeURIComponent(productId)}`);
  if (!res.ok) return "0";
  const json = (await res.json()) as { incoming?: string; quantity?: string };
  return json.incoming ?? json.quantity ?? "0";
};

export const listProducts = async (q?: string): Promise<ProductOption[]> => {
  const params = new URLSearchParams({ take: "200" });
  if (q) params.set("q", q);
  const res = await purchasingFetch(`/products?${params}`);
  if (!res.ok) return [];
  const json = await res.json();
  return asList<{ id: string; name: string; sku?: string | null; costPrice?: string }>(json).map(
    (p) => ({ id: p.id, name: p.name, sku: p.sku, costPrice: p.costPrice }),
  );
};

export const listLocations = async (): Promise<LocationOption[]> => {
  const res = await purchasingFetch("/locations");
  if (!res.ok) return [];
  return asList<LocationOption>(await res.json());
};

export const listGoodsReceipts = async (params?: {
  purchaseOrderId?: string;
  supplierId?: string;
}): Promise<Array<{ id: string; receiptNumber: string; purchaseOrderId?: string | null; receivedAt: string }>> => {
  const qs = new URLSearchParams();
  if (params?.purchaseOrderId) qs.set("purchaseOrderId", params.purchaseOrderId);
  if (params?.supplierId) qs.set("supplierId", params.supplierId);
  const q = qs.toString();
  const res = await purchasingFetch(`/goods-receipts${q ? `?${q}` : ""}`);
  if (!res.ok) return [];
  return asList(await res.json());
};

export const DEFAULT_PO_APPROVE_THRESHOLD = "10000";

export const parsePoApproveThreshold = (api: Record<string, unknown> | null | undefined): string => {
  const dotted = api?.["purchasing.poApproveThreshold"];
  const camel = api?.poApproveThreshold;
  const raw = dotted ?? camel ?? DEFAULT_PO_APPROVE_THRESHOLD;
  return String(raw);
};

export const poStatusVariant = (
  status: string,
): "neutral" | "warning" | "info" | "success" | "danger" => {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "APPROVED":
      return "info";
    case "SENT":
    case "PARTIALLY_RECEIVED":
      return "warning";
    case "RECEIVED":
    case "CLOSED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
};
