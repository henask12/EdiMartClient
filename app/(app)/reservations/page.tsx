"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { patchReservation, reservationErrorMessage } from "@/lib/reservation-api";
import { Check, Pencil, X } from "@/lib/icons";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 15;

type Reservation = {
  id: string;
  quantity: string;
  status: string;
  customerName: string | null;
  createdAt: string;
  reservedDate: string;
  expiresAt: string | null;
  reservationEndDate: string | null;
  product: { id: string; name: string; category: { name: string } };
};

const STATUS_FILTERS = ["RESERVED", "COMPLETED", "CANCELLED", "EXPIRED"] as const;

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [status, setStatus] = useState("RESERVED");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Reservation | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editCustomer, setEditCustomer] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editOnHand, setEditOnHand] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const qtySubtotal = useMemo(
    () => items.reduce((sum, r) => sum + Number(r.quantity), 0),
    [items],
  );

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      status,
      take: String(PAGE_SIZE),
      skip: String((page - 1) * PAGE_SIZE),
    });
    const res = await fetch(`/api/proxy/reservations?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: Reservation[]; total: number };
      setItems(data.items);
      setTotal(data.total);
    } else {
      toastError("Failed to load reservations");
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenEdit = async (r: Reservation) => {
    setEditTarget(r);
    setEditQty(r.quantity);
    setEditCustomer(r.customerName ?? "");
    setEditEndDate(r.expiresAt ? r.expiresAt.slice(0, 10) : "");
    setEditOnHand(null);
    const res = await fetch(`/api/proxy/products/${r.product.id}`, { cache: "no-store" });
    if (res.ok) {
      const product = (await res.json()) as { onHand?: string };
      setEditOnHand(product.onHand ?? null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const qty = Number(editQty);
    if (!qty || qty <= 0) {
      toastError("Enter a valid quantity");
      return;
    }
    if (editOnHand != null && qty > Number(editOnHand)) {
      toastError(`Quantity cannot exceed on hand (${editOnHand})`);
      return;
    }
    setEditSaving(true);
    const { ok, data } = await patchReservation(editTarget.id, {
      quantity: editQty,
      customerName: editCustomer,
      expiresAt: editEndDate || null,
    });
    if (!ok) {
      toastError(reservationErrorMessage(data, "Update failed"));
    } else {
      setEditTarget(null);
      toastSuccess("Reservation updated");
      await load();
    }
    setEditSaving(false);
  };

  const handleCancel = async (id: string) => {
    setLoadingId(id);
    const res = await fetch(`/api/proxy/reservations/${id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Cancel failed"));
    } else {
      toastSuccess("Reservation cancelled");
      await load();
    }
    setLoadingId(null);
  };

  const handleComplete = async (id: string) => {
    setLoadingId(id);
    const res = await fetch(`/api/proxy/reservations/${id}/complete`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Complete failed"));
    } else {
      toastSuccess("Sale recorded");
      await load();
    }
    setLoadingId(null);
  };

  const statusBadge = (s: string) => {
    if (s === "RESERVED") return <Badge variant="warning">Reserved</Badge>;
    if (s === "COMPLETED") return <Badge variant="success">Completed</Badge>;
    if (s === "EXPIRED") return <Badge variant="danger">Expired</Badge>;
    return <Badge variant="neutral">Cancelled</Badge>;
  };

  const rowActions = (r: Reservation) =>
    r.status === "RESERVED" ? (
      <ActionGroup>
        <IconButton
          variant="secondary"
          aria-label="Edit reservation"
          title="Edit"
          icon={<Pencil />}
          disabled={loadingId === r.id}
          onClick={() => void handleOpenEdit(r)}
        />
        <IconButton
          variant="primary"
          aria-label="Complete reservation"
          title="Complete"
          icon={<Check />}
          disabled={loadingId === r.id}
          onClick={() => void handleComplete(r.id)}
        />
        <IconButton
          variant="danger"
          aria-label="Cancel reservation"
          title="Cancel"
          icon={<X />}
          disabled={loadingId === r.id}
          onClick={() => void handleCancel(r.id)}
        />
      </ActionGroup>
    ) : (
      <span className="text-xs text-white/40">—</span>
    );

  const columns: DataTableColumn<Reservation>[] = [
    {
      key: "product",
      header: "Product",
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.product.name}</p>
          <p className="text-xs text-white/45">{r.product.category.name}</p>
        </div>
      ),
    },
    { key: "qty", header: "Qty", className: "tabular-nums", render: (r) => r.quantity },
    { key: "customer", header: "Customer", render: (r) => r.customerName ?? "—" },
    { key: "status", header: "Status", render: (r) => statusBadge(r.status) },
    { key: "reservedDate", header: "Reserved date", render: (r) => new Date(r.reservedDate).toLocaleDateString() },
    { key: "endDate", header: "Reservation end date", render: (r) => (r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—") },
    { key: "actions", header: "", className: "text-right", render: rowActions },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" description="Held stock until sold or cancelled." />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              "rounded-[var(--radius-full)] px-4 py-2 text-xs font-semibold transition focus-ring",
              status === s
                ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]"
                : "bg-white/5 text-white/60 hover:bg-white/10",
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        footer={{ label: "Page subtotal", cells: { qty: qtySubtotal.toString() } }}
        emptyMessage="No reservations."
        mobileCard={(r) => (
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{r.product.name}</p>
                <p className="text-xs text-white/50">
                  Qty {r.quantity}
                  {r.customerName ? ` · ${r.customerName}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  Reserved: {new Date(r.reservedDate).toLocaleDateString()} · End:{" "}
                  {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—"}
                </p>
              </div>
              {statusBadge(r.status)}
            </div>
            {r.status === "RESERVED" ? rowActions(r) : null}
          </div>
        )}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-reservation-title"
          >
            <h2 id="edit-reservation-title" className="text-lg font-semibold text-white">
              Edit reservation
            </h2>
            <p className="mt-1 text-sm text-white/55">{editTarget.product.name}</p>

            <div className="mt-4 space-y-3">
              <Input
                label="Quantity"
                type="number"
                min="0.01"
                max={editOnHand ?? undefined}
                step="any"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                hint={editOnHand != null ? `On hand: ${editOnHand}` : undefined}
              />
              <Input
                label="Customer name"
                type="text"
                value={editCustomer}
                onChange={(e) => setEditCustomer(e.target.value)}
                placeholder="Optional"
              />
              <Input
                label="Reservation end date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
              />
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setEditTarget(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                fullWidth
                disabled={editSaving}
                onClick={() => void handleSaveEdit()}
              >
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
