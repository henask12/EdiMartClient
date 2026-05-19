"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 15;

type Reservation = {
  id: string;
  quantity: string;
  status: string;
  customerName: string | null;
  createdAt: string;
  product: { id: string; name: string; category: { name: string } };
};

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [status, setStatus] = useState("RESERVED");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async (id: string) => {
    setMessage(null);
    setLoadingId(id);
    const res = await fetch(`/api/proxy/reservations/${id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(typeof data.message === "string" ? data.message : "Cancel failed");
    } else {
      await load();
    }
    setLoadingId(null);
  };

  const handleComplete = async (id: string) => {
    setMessage(null);
    setLoadingId(id);
    const res = await fetch(`/api/proxy/reservations/${id}/complete`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(typeof data.message === "string" ? data.message : "Complete failed");
    } else {
      setMessage("Sale recorded");
      await load();
    }
    setLoadingId(null);
  };

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
    {
      key: "qty",
      header: "Qty",
      className: "tabular-nums",
      render: (r) => r.quantity,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => r.customerName ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className="text-xs uppercase text-white/60">{r.status}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) =>
        r.status === "RESERVED" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={loadingId === r.id}
              onClick={() => void handleComplete(r.id)}
              className="tap btn-primary px-2 py-1 text-xs disabled:opacity-50"
            >
              {loadingId === r.id ? "…" : "Complete"}
            </button>
            <button
              type="button"
              disabled={loadingId === r.id}
              onClick={() => void handleCancel(r.id)}
              className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="text-xs text-white/40">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reservations</h1>
        <p className="mt-2 text-sm text-white/60">Held stock until sold or cancelled.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["RESERVED", "COMPLETED", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === s ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]" : "bg-white/5 text-white/60"
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {message ? (
        <p
          className={`text-sm ${message === "Sale recorded" ? "text-[var(--accent)]" : "text-rose-200"}`}
        >
          {message}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        emptyMessage="No reservations."
        mobileCard={(r) => (
          <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/80 p-4 text-sm">
            <p className="font-medium text-white">{r.product.name}</p>
            <p className="text-xs text-white/50">
              Qty {r.quantity} · {r.status}
              {r.customerName ? ` · ${r.customerName}` : ""}
            </p>
            {r.status === "RESERVED" ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={loadingId === r.id}
                  onClick={() => void handleComplete(r.id)}
                  className="tap btn-primary flex-1 py-2 text-xs"
                >
                  Complete
                </button>
                <button
                  type="button"
                  disabled={loadingId === r.id}
                  onClick={() => void handleCancel(r.id)}
                  className="flex-1 rounded-lg border border-white/15 py-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        )}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
