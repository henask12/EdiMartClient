"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pencil } from "@/lib/icons";
import { toastError } from "@/lib/toast";

type ExpiryRow = {
  id: string;
  source: "batch" | "product";
  productId: string;
  productName: string;
  categoryName: string;
  qtyRemaining: string;
  expiryDate: string;
  daysLeft: number;
  status: "expired" | "expiring" | "ok";
};

type StatusFilter = "expiring" | "expired" | "all";

export default function ExpiryPage() {
  const [status, setStatus] = useState<StatusFilter>("expiring");
  const [items, setItems] = useState<ExpiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const qtySubtotal = useMemo(
    () => items.reduce((sum, r) => sum + Number(r.qtyRemaining), 0),
    [items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, days: "7" });
      const res = await fetch(`/api/proxy/inventory/expiry?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load expiry data");
      const data = (await res.json()) as { items: ExpiryRow[] };
      setItems(data.items);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load expiry data");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusBadge = (row: ExpiryRow) => {
    if (row.status === "expired") return <Badge variant="danger">Expired</Badge>;
    if (row.status === "expiring") return <Badge variant="warning">Expiring soon</Badge>;
    return <Badge variant="neutral">OK</Badge>;
  };

  const columns: DataTableColumn<ExpiryRow>[] = [
    {
      key: "product",
      header: "Product",
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.productName}</p>
          <p className="text-xs text-white/45">{r.categoryName}</p>
        </div>
      ),
    },
    {
      key: "qty",
      header: "On hand",
      className: "tabular-nums",
      render: (r) => r.qtyRemaining,
    },
    { key: "expiry", header: "Expiry", render: (r) => r.expiryDate },
    {
      key: "days",
      header: "Days left",
      className: "tabular-nums",
      render: (r) => (r.daysLeft < 0 ? `${Math.abs(r.daysLeft)}d ago` : `${r.daysLeft}d`),
    },
    { key: "status", header: "Status", render: (r) => statusBadge(r) },
    {
      key: "source",
      header: "Source",
      render: (r) => (
        <span className="text-xs text-white/45">{r.source === "batch" ? "Batch" : "Product"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-12",
      render: (r) => (
        <ActionGroup>
          <Link href={`/products/${r.productId}/edit`}>
            <IconButton variant="secondary" aria-label="Edit product" title="Edit" icon={<Pencil />} />
          </Link>
        </ActionGroup>
      ),
    },
  ];

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "expiring", label: "Expiring soon" },
    { value: "expired", label: "Expired" },
    { value: "all", label: "All with expiry" },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Expiry alerts"
        description="On-hand stock with batch or product expiry dates."
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={status === f.value ? "primary" : "secondary"}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-sm text-white/50">Loading…</p> : null}

      {!loading ? (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          footer={{
            label: "Page subtotal",
            cells: { qty: qtySubtotal.toString() },
          }}
          emptyMessage="No items match this filter."
          mobileCard={(r) => (
            <div className="card-surface space-y-3 p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{r.productName}</p>
                  <p className="text-xs text-white/45">{r.categoryName}</p>
                </div>
                {statusBadge(r)}
              </div>
              <p className="text-white/70">
                {r.qtyRemaining} on hand · expires {r.expiryDate}
              </p>
              <Link href={`/products/${r.productId}/edit`}>
                <IconButton variant="secondary" aria-label="Edit product" icon={<Pencil />} />
              </Link>
            </div>
          )}
        />
      ) : null}
    </section>
  );
}
