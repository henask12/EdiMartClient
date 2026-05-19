"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AddStockFilters } from "@/components/AddStockFilters";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ReceiveStockPickerModal } from "@/components/ReceiveStockPickerModal";
import { StockHistoryModal } from "@/components/StockHistoryModal";
import { dedupeCategories } from "@/lib/dedupe-categories";
import { canDeactivateProduct } from "@/lib/product-permissions";
import { formatBirr } from "@/lib/format-price";

type Category = { id: string; name: string };
type StockRow = {
  id: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  onHand: string;
  available: string;
  restockAt: number;
  stockStatus?: string;
  category: { id: string; name: string };
  productType?: { id: string; name: string } | null;
};

const stockLabel = (row: StockRow) => {
  const available = Number(row.available);
  if (available <= 0) return "OUT of Stock";
  if (available <= row.restockAt) return "Low";
  return "In stock";
};

export default function AddStockPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<StockRow[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<{ id: string; name: string } | null>(null);

  const canDeactivate = canDeactivateProduct(permissions);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    void fetch("/api/proxy/categories", { cache: "no-store" }).then(async (res) => {
      if (res.ok) setCategories(dedupeCategories((await res.json()) as Category[]));
    });
    void fetch("/api/proxy/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.permissions)) {
          setPermissions(data.permissions as string[]);
        }
      });
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(pageSize),
        skip: String((page - 1) * pageSize),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      if (categoryId) params.set("categoryId", categoryId);
      if (stockStatus) params.set("stockStatus", stockStatus);
      const res = await fetch(`/api/proxy/products?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load products");
      const data = (await res.json()) as { items: StockRow[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [debouncedQ, categoryId, stockStatus, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (row: StockRow) => {
    if (!confirm(`Deactivate "${row.name}"?`)) return;
    const res = await fetch(`/api/proxy/products/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Could not deactivate");
    }
  };

  const columns: DataTableColumn<StockRow>[] = [
    {
      key: "name",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.name}</p>
          <p className="text-xs text-white/45">
            {row.productType?.name ?? "—"} · {row.category.name}
          </p>
        </div>
      ),
    },
    {
      key: "onHand",
      header: "On hand",
      className: "tabular-nums",
      render: (row) => row.onHand,
    },
    {
      key: "available",
      header: "Available",
      className: "tabular-nums",
      render: (row) => row.available,
    },
    {
      key: "cost",
      header: "Cost",
      className: "tabular-nums",
      render: (row) => formatBirr(row.costPrice),
    },
    {
      key: "price",
      header: "Sell",
      className: "tabular-nums",
      render: (row) => formatBirr(row.sellingPrice),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const label = stockLabel(row);
        const cls =
          label === "OUT of Stock"
            ? "text-rose-200"
            : label === "Low"
              ? "text-amber-200"
              : "text-emerald-200";
        return <span className={`text-xs font-semibold ${cls}`}>{label}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={`/products/${row.id}/edit`}
            className="tap rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80"
          >
            Edit
          </Link>
          {canDeactivate ? (
            <button
              type="button"
              onClick={() => void handleDeactivate(row)}
              className="tap rounded-lg border border-rose-500/30 px-2 py-1 text-xs font-semibold text-rose-200"
            >
              Deactivate
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setHistoryProduct({ id: row.id, name: row.name })}
            className="tap rounded-lg border border-white/15 px-2 py-1 text-xs text-white/70"
          >
            History
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Add stock</h1>
          <p className="mt-2 text-sm text-white/60">
            Receive inventory and manage product stock levels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="tap btn-primary shrink-0 px-5 py-2.5 text-sm"
        >
          Add stock
        </button>
      </header>

      <AddStockFilters
        q={q}
        onQChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={(id) => {
          setCategoryId(id);
          setPage(1);
        }}
        stockStatus={stockStatus}
        onStockStatusChange={(value) => {
          setStockStatus(value);
          setPage(1);
        }}
      />

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        emptyMessage="No products match your filters."
        mobileCard={(row) => (
          <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-4 text-sm">
            <p className="font-medium text-white">{row.name}</p>
            <p className="text-xs text-white/50">
              {row.category.name} · On hand {row.onHand} · {stockLabel(row)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/products/${row.id}/edit`}
                className="tap rounded-lg border border-white/15 px-2 py-2 text-xs text-white/80"
              >
                Edit
              </Link>
              {canDeactivate ? (
                <button
                  type="button"
                  onClick={() => void handleDeactivate(row)}
                  className="tap rounded-lg border border-rose-500/30 px-2 py-2 text-xs text-rose-200"
                >
                  Deactivate
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setHistoryProduct({ id: row.id, name: row.name })}
                className="tap rounded-lg border border-white/15 px-2 py-2 text-xs text-white/70"
              >
                History
              </button>
            </div>
          </div>
        )}
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[15, 25, 50, 100]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <ReceiveStockPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSuccess={() => void load()}
      />

      <StockHistoryModal
        productId={historyProduct?.id ?? null}
        productName={historyProduct?.name ?? ""}
        onClose={() => setHistoryProduct(null)}
      />
    </div>
  );
};
