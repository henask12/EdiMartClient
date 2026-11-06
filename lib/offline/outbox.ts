import { get, set } from "idb-keyval";
import { getStoredRegisterCode } from "@/lib/register-device";

export type OutboxKind = "sale" | "stock_count" | "goods_receipt";

export type OutboxStatus = "pending" | "syncing" | "conflict" | "failed";

export type OutboxItem = {
  id: string;
  kind: OutboxKind;
  createdAt: number;
  status: OutboxStatus;
  idempotencyKey?: string;
  clientSaleId?: string;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  body: unknown;
  headers?: Record<string, string>;
  lastError?: string;
  conflictPayload?: unknown;
  label?: string;
};

const OUTBOX_KEY = "edimart-offline-outbox";
export const OUTBOX_CHANGED_EVENT = "edimart-outbox-changed";

const notify = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT));
};

const readAll = async (): Promise<OutboxItem[]> => {
  try {
    const rows = await get<OutboxItem[]>(OUTBOX_KEY);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const writeAll = async (rows: OutboxItem[]): Promise<void> => {
  try {
    await set(OUTBOX_KEY, rows);
  } catch {
    /* IndexedDB unavailable */
  }
  notify();
};

export const listOutbox = async (): Promise<OutboxItem[]> => readAll();

export const countPendingSales = async (): Promise<number> => {
  const rows = await readAll();
  return rows.filter(
    (r) =>
      r.kind === "sale" &&
      (r.status === "pending" || r.status === "syncing" || r.status === "failed"),
  ).length;
};

export const countNeedsAttention = async (): Promise<number> => {
  const rows = await readAll();
  return rows.filter((r) => r.status === "conflict" || r.status === "failed").length;
};

export const enqueueOutbox = async (
  item: Omit<OutboxItem, "createdAt" | "status"> & {
    status?: OutboxStatus;
  },
): Promise<OutboxItem> => {
  const row: OutboxItem = {
    ...item,
    createdAt: Date.now(),
    status: item.status ?? "pending",
  };
  const rows = await readAll();
  rows.push(row);
  await writeAll(rows);
  return row;
};

export const updateOutboxItem = async (
  id: string,
  patch: Partial<OutboxItem>,
): Promise<OutboxItem | null> => {
  const rows = await readAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  rows[idx] = { ...rows[idx], ...patch };
  await writeAll(rows);
  return rows[idx];
};

export const removeOutboxItem = async (id: string): Promise<void> => {
  const rows = await readAll();
  await writeAll(rows.filter((r) => r.id !== id));
};

export const pendingSaleLabel = (clientSaleId: string): string => {
  const code = getStoredRegisterCode();
  const short = clientSaleId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `PENDING-${code}-${short}`;
};

export const enqueueSaleCheckout = async (opts: {
  clientSaleId: string;
  idempotencyKey: string;
  body: unknown;
  headers?: Record<string, string>;
  label?: string;
}): Promise<OutboxItem> =>
  enqueueOutbox({
    id: opts.clientSaleId,
    kind: "sale",
    clientSaleId: opts.clientSaleId,
    idempotencyKey: opts.idempotencyKey,
    endpoint: "/api/proxy/sales/checkout",
    method: "POST",
    body: opts.body,
    headers: opts.headers,
    label: opts.label ?? pendingSaleLabel(opts.clientSaleId),
  });

export const enqueueStockCount = async (opts: {
  id?: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  body: unknown;
  label?: string;
}): Promise<OutboxItem> => {
  const id =
    opts.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sc-${Date.now()}`);
  return enqueueOutbox({
    id,
    kind: "stock_count",
    endpoint: opts.endpoint,
    method: opts.method ?? "POST",
    body: opts.body,
    label: opts.label ?? `Stock count ${id.slice(0, 8)}`,
  });
};

export const enqueueGoodsReceipt = async (opts: {
  id?: string;
  body: unknown;
  label?: string;
}): Promise<OutboxItem> => {
  const id =
    opts.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `gr-${Date.now()}`);
  return enqueueOutbox({
    id,
    kind: "goods_receipt",
    endpoint: "/api/proxy/goods-receipts",
    method: "POST",
    body: opts.body,
    headers: { "content-type": "application/json" },
    label: opts.label ?? `Goods receipt ${id.slice(0, 8)}`,
  });
};

const isNetworkFailure = (status: number) =>
  status === 0 || status === 408 || status === 502 || status === 503 || status === 504;

const isBusinessConflict = (status: number, data: { code?: string }) =>
  status === 409 ||
  status === 422 ||
  String(data.code ?? "").includes("CONFLICT") ||
  String(data.code ?? "") === "INSUFFICIENT_STOCK";

/** Report a local conflict to the API when available (404 is fine — keep local). */
const reportConflictToApi = async (item: OutboxItem, detail: unknown) => {
  try {
    const res = await fetch("/api/proxy/sync/conflicts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: item.id,
        kind: item.kind,
        endpoint: item.endpoint,
        payload: item.body,
        detail,
      }),
    });
    if (res.status === 404) return;
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      if (data.id) {
        const base =
          detail && typeof detail === "object" && !Array.isArray(detail)
            ? (detail as Record<string, unknown>)
            : { detail };
        await updateOutboxItem(item.id, {
          conflictPayload: { ...base, remoteId: data.id },
        });
      }
    }
  } catch {
    /* keep local conflict only */
  }
};

/**
 * Flush the outbox FIFO. Never silently drops items: success removes,
 * network keeps pending, business conflicts stay marked for review.
 */
export const flushOutbox = async (): Promise<{
  synced: number;
  conflicts: number;
  remaining: number;
}> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const rows = await readAll();
    return { synced: 0, conflicts: 0, remaining: rows.length };
  }

  let synced = 0;
  let conflicts = 0;
  const rows = await readAll();
  const ordered = [...rows].sort((a, b) => a.createdAt - b.createdAt);

  for (const item of ordered) {
    if (item.status === "conflict") {
      conflicts += 1;
      continue;
    }
    if (item.status !== "pending" && item.status !== "failed" && item.status !== "syncing") {
      continue;
    }

    await updateOutboxItem(item.id, { status: "syncing", lastError: undefined });

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...(item.headers ?? {}),
      };
      if (item.idempotencyKey) headers["idempotency-key"] = item.idempotencyKey;

      const res = await fetch(item.endpoint, {
        method: item.method,
        headers,
        body: JSON.stringify(item.body),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        await removeOutboxItem(item.id);
        synced += 1;
        continue;
      }

      if (isNetworkFailure(res.status)) {
        await updateOutboxItem(item.id, {
          status: "pending",
          lastError:
            typeof (data as { message?: string }).message === "string"
              ? (data as { message: string }).message
              : `HTTP ${res.status}`,
        });
        break;
      }

      if (isBusinessConflict(res.status, data as { code?: string })) {
        await updateOutboxItem(item.id, {
          status: "conflict",
          lastError:
            typeof (data as { message?: string }).message === "string"
              ? (data as { message: string }).message
              : `Conflict (${res.status})`,
          conflictPayload: data,
        });
        await reportConflictToApi(item, data);
        conflicts += 1;
        continue;
      }

      await updateOutboxItem(item.id, {
        status: "failed",
        lastError:
          typeof (data as { message?: string }).message === "string"
            ? (data as { message: string }).message
            : `HTTP ${res.status}`,
        conflictPayload: data,
      });
      conflicts += 1;
    } catch (err) {
      await updateOutboxItem(item.id, {
        status: "pending",
        lastError: err instanceof Error ? err.message : "Network error",
      });
      break;
    }
  }

  const remaining = (await readAll()).length;
  return { synced, conflicts, remaining };
};
