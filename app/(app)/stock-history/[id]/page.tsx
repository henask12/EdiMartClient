"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type MovementDetail = {
  id: string;
  type: string;
  qtyDelta: string;
  beforeOnHand: string | null;
  afterOnHand: string | null;
  unitCost: string | null;
  refType: string | null;
  refId: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  stockBatch: {
    id: string;
    qtyReceived: string;
    qtyRemaining: string;
    unitCost: string;
    expiryDate: string | null;
    receivedAt: string;
  } | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
  inventoryItem: {
    location: { name: string; code: string };
    product: {
      id: string;
      name: string;
      sku: string | null;
      category: { name: string };
      productType: { name: string } | null;
    };
  };
};

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIPT: "RECEIVED",
  SALE: "SOLD",
  RETURN: "RETURNED",
  ADJUSTMENT: "ADJUSTED",
  TRANSFER: "TRANSFERRED",
  RESERVE: "RESERVED",
  RELEASE_RESERVE: "RESERVE RELEASED",
  DAMAGE: "DAMAGED",
};

const label = "text-xs font-semibold uppercase tracking-wide text-white/45";
const value = "mt-1 text-sm text-white";

export default function StockHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [movement, setMovement] = useState<MovementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/proxy/stock/history/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setError("Movement not found");
        return;
      }
      setMovement((await res.json()) as MovementDetail);
    };
    void load();
  }, [id]);

  if (error) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-rose-200">{error}</p>
        <Link href="/stock-history" className="text-sm text-[var(--accent-2)]">
          ← Back to history
        </Link>
      </section>
    );
  }

  if (!movement) {
    return <p className="text-sm text-white/60">Loading…</p>;
  }

  const positive = Number(movement.qtyDelta) >= 0;
  const product = movement.inventoryItem.product;

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <header>
        <Link href="/stock-history" className="text-sm text-[var(--accent-2)]">
          ← Stock history
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-white">Movement detail</h1>
        <p className="mt-1 text-sm text-white/60">{new Date(movement.createdAt).toLocaleString()}</p>
      </header>

      <article className="section-card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={label}>Product</p>
            <p className="text-lg font-semibold text-white">{product.name}</p>
            <p className="mt-1 text-xs text-white/50">
              {product.category.name}
              {product.productType ? ` · ${product.productType.name}` : ""}
              {product.sku ? ` · SKU ${product.sku}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
              positive ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]" : "bg-rose-500/20 text-rose-200"
            }`}
          >
            {positive ? "+" : ""}
            {movement.qtyDelta}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className={label}>Type</dt>
            <dd className={value}>{MOVEMENT_LABELS[movement.type] ?? movement.type}</dd>
          </div>
          <div>
            <dt className={label}>Location</dt>
            <dd className={value}>{movement.inventoryItem.location.name}</dd>
          </div>
          <div>
            <dt className={label}>On hand before</dt>
            <dd className={`${value} tabular-nums`}>{movement.beforeOnHand ?? "—"}</dd>
          </div>
          <div>
            <dt className={label}>On hand after</dt>
            <dd className={`${value} tabular-nums`}>{movement.afterOnHand ?? "—"}</dd>
          </div>
          {movement.unitCost ? (
            <div>
              <dt className={label}>Unit cost</dt>
              <dd className={`${value} tabular-nums`}>{movement.unitCost}</dd>
            </div>
          ) : null}
          {movement.createdBy ? (
            <div>
              <dt className={label}>Recorded by</dt>
              <dd className={value}>{movement.createdBy.displayName ?? movement.createdBy.email}</dd>
            </div>
          ) : null}
          {movement.refType ? (
            <div>
              <dt className={label}>Reference</dt>
              <dd className={value}>
                {movement.refType}
                {movement.refId ? ` · ${movement.refId.slice(0, 8)}…` : ""}
              </dd>
            </div>
          ) : null}
        </dl>

        {movement.notes ? (
          <div>
            <p className={label}>Notes</p>
            <p className={`${value} whitespace-pre-wrap`}>{movement.notes}</p>
          </div>
        ) : null}

        {movement.stockBatch ? (
          <section className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="text-sm font-semibold text-white/80">Batch</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className={label}>Received</dt>
                <dd className={value}>{movement.stockBatch.receivedAt.slice(0, 10)}</dd>
              </div>
              <div>
                <dt className={label}>Expiry</dt>
                <dd className={value}>{movement.stockBatch.expiryDate?.slice(0, 10) ?? "—"}</dd>
              </div>
              <div>
                <dt className={label}>Qty received</dt>
                <dd className={`${value} tabular-nums`}>{movement.stockBatch.qtyReceived}</dd>
              </div>
              <div>
                <dt className={label}>Qty remaining</dt>
                <dd className={`${value} tabular-nums`}>{movement.stockBatch.qtyRemaining}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </article>
    </section>
  );
}
