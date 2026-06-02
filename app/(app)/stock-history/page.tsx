"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Eye } from "@/lib/icons";
import { toastError } from "@/lib/toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";

const MOVEMENT_TYPES = [
  "",
  "RECEIPT",
  "SALE",
  "RETURN",
  "ADJUSTMENT",
  "TRANSFER",
  "RESERVE",
  "RELEASE_RESERVE",
  "DAMAGE",
] as const;

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

type ReservationMeta = {
  reservedQty?: string;
  availableBefore?: string;
  availableAfter?: string;
  customerName?: string | null;
};

type Movement = {
  id: string;
  type: string;
  qtyDelta: string;
  beforeOnHand: string | null;
  afterOnHand: string | null;
  createdAt: string;
  notes: string | null;
  reservationMeta: ReservationMeta | null;
  stockBatch: { expiryDate: string | null } | null;
  inventoryItem: {
    product: { id: string; name: string; category: { name: string } };
  };
};

type Product = { id: string; name: string };

const toNumber = (value: string | null | undefined) => {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: string | number | null | undefined) =>
  toNumber(typeof value === "number" ? String(value) : value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

const movementLabel = (type: string) => MOVEMENT_LABELS[type] ?? type;

const formatReserveContext = (m: Movement): string | null => {
  const meta = m.reservationMeta;
  if (!meta?.availableBefore || !meta?.availableAfter) return null;

  if (m.type === "RESERVE") {
    const delta = meta.reservedQty ?? m.qtyDelta;
    const sign = Number(delta) >= 0 ? "+" : "";
    return `Reserved ${sign}${delta} · Avail ${meta.availableBefore} → ${meta.availableAfter}`;
  }
  if (m.type === "RELEASE_RESERVE") {
    const delta = meta.reservedQty ?? m.qtyDelta;
    return `Released ${delta} · Avail ${meta.availableBefore} → ${meta.availableAfter}`;
  }
  return null;
};

export default function StockHistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      take: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (productId) params.set("productId", productId);
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/proxy/stock/history?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: Movement[]; total: number };
      setMovements(data.items);
      setTotal(data.total);
    } else {
      toastError("Failed to load stock history");
    }
    setLoading(false);
  }, [productId, type, from, to, page, pageSize]);

  useEffect(() => {
    void fetch("/api/proxy/products?take=200", { cache: "no-store" }).then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as { items: Product[] };
        setProducts(data.items);
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<Movement>[] = [
    {
      key: "product",
      header: "Product",
      render: (m) => (
        <div>
          <p className="font-medium text-white">{m.inventoryItem.product.name}</p>
          <p className="text-xs text-white/45">{m.inventoryItem.product.category.name}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (m) => new Date(m.createdAt).toLocaleString(),
    },
    {
      key: "type",
      header: "Type",
      render: (m) => movementLabel(m.type),
    },
    {
      key: "onHand",
      header: "On hand",
      className: "tabular-nums",
      render: (m) => formatNumber(m.afterOnHand ?? m.beforeOnHand),
    },
    {
      key: "sold",
      header: "Sold",
      className: "tabular-nums",
      render: (m) => (m.type === "SALE" ? formatNumber(Math.abs(toNumber(m.qtyDelta))) : "0"),
    },
    {
      key: "reserved",
      header: "Reserved",
      className: "tabular-nums",
      render: (m) =>
        m.type === "RESERVE" || m.type === "RELEASE_RESERVE"
          ? formatNumber(Math.abs(toNumber(m.qtyDelta)))
          : "0",
    },
    {
      key: "restocked",
      header: "Restocked",
      className: "tabular-nums",
      render: (m) => (m.type === "RECEIPT" ? formatNumber(Math.abs(toNumber(m.qtyDelta))) : "0"),
    },
    {
      key: "detail",
      header: "Movement detail",
      render: (m) => {
        const positive = toNumber(m.qtyDelta) >= 0;
        const qty = formatNumber(m.qtyDelta);
        if (m.type === "RESERVE" || m.type === "RELEASE_RESERVE") {
          const ctx = formatReserveContext(m);
          return (
            <span className={`text-xs ${ctx ? "text-white/70" : positive ? "text-[var(--accent)]" : "text-rose-300"}`}>
              {ctx ?? `${positive ? "+" : "-"}${qty}`}
            </span>
          );
        }
        return (
          <span className={`tabular-nums ${positive ? "text-[var(--accent)]" : "text-rose-300"}`}>
            {positive ? "+" : "-"}
            {qty}
          </span>
        );
      },
    },
    {
      key: "reserve",
      header: "Reservation",
      render: (m) => {
        const ctx = formatReserveContext(m);
        if (ctx) {
          return <span className="text-xs text-white/70">{ctx}</span>;
        }
        if (m.type === "RESERVE" || m.type === "RELEASE_RESERVE") {
          const positive = Number(m.qtyDelta) >= 0;
          return (
            <span className={`text-xs tabular-nums ${positive ? "text-[var(--accent)]" : "text-rose-300"}`}>
              Qty {positive ? "+" : ""}
              {formatNumber(m.qtyDelta)}
            </span>
          );
        }
        return <span className="text-xs text-white/40">—</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (m) => (
        <ActionGroup>
          <Link href={`/stock-history/${m.id}`}>
            <IconButton variant="secondary" aria-label="View movement" icon={<Eye />} />
          </Link>
        </ActionGroup>
      ),
    },
  ];

  const movementDetailSubtotal = movements.reduce((sum, m) => sum + toNumber(m.qtyDelta), 0);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Stock history"
        description="Paginated ledger — reserves show on-hand and available changes."
      />

      <DateRangeFilter
        from={draftFrom}
        to={draftTo}
        onFromChange={setDraftFrom}
        onToChange={setDraftTo}
        onApply={() => {
          if (draftFrom && draftTo && draftFrom > draftTo) {
            setDateError("“From” must be on or before “To”.");
            return;
          }
          setDateError(null);
          setFrom(draftFrom);
          setTo(draftTo);
          setPage(1);
        }}
      />
      {dateError ? <p className="text-sm text-rose-200">{dateError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Product"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          label="Movement type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          {MOVEMENT_TYPES.map((t) => (
            <option key={t || "all"} value={t}>
              {t ? movementLabel(t) : "All types"}
            </option>
          ))}
        </Select>
      </div>

      <ExportMenu
        basePath="stock/history/export"
        queryParams={{
          productId: productId || undefined,
          type: type || undefined,
          from: from || undefined,
          to: to || undefined,
        }}
      />

      {loading ? <p className="text-sm text-white/50">Loading…</p> : null}

      <DataTable
        columns={columns}
        rows={movements}
        rowKey={(m) => m.id}
        footer={{
          label: "Page subtotal",
          cells: {
            detail: (
              <span className="tabular-nums">
                {movementDetailSubtotal >= 0 ? "+" : ""}
                {formatNumber(movementDetailSubtotal)}
              </span>
            ),
          },
        }}
        emptyMessage="No movements match filters."
        mobileCard={(m) => {
          const ctx = formatReserveContext(m);
          return (
            <Link
              href={`/stock-history/${m.id}`}
              className="block rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-4 text-sm"
            >
              <p className="font-medium text-white">{m.inventoryItem.product.name}</p>
              <p className="text-xs text-white/50">
                {new Date(m.createdAt).toLocaleString()} · {movementLabel(m.type)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/70">
                <p>On hand: <span className="tabular-nums">{formatNumber(m.afterOnHand ?? m.beforeOnHand)}</span></p>
                <p>Sold: <span className="tabular-nums">{m.type === "SALE" ? formatNumber(Math.abs(toNumber(m.qtyDelta))) : "0"}</span></p>
                <p>Reserved: <span className="tabular-nums">{m.type === "RESERVE" || m.type === "RELEASE_RESERVE" ? formatNumber(Math.abs(toNumber(m.qtyDelta))) : "0"}</span></p>
                <p>Restocked: <span className="tabular-nums">{m.type === "RECEIPT" ? formatNumber(Math.abs(toNumber(m.qtyDelta))) : "0"}</span></p>
              </div>
              {ctx ? <p className="mt-1 text-xs text-white/55">{ctx}</p> : null}
            </Link>
          );
        }}
      />

      <footer className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[15, 25, 50, 100]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </footer>
    </section>
  );
}
