"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseApiMessage, toastError } from "@/lib/toast";
import { AddStockFilters } from "@/components/AddStockFilters";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ReceiveStockPickerModal } from "@/components/ReceiveStockPickerModal";
import { StockHistoryModal } from "@/components/StockHistoryModal";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { dedupeCategories } from "@/lib/dedupe-categories";
import { History, Pencil, Plus, Trash2 } from "@/lib/icons";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<{ id: string; name: string } | null>(null);
  const [deactivateRow, setDeactivateRow] = useState<StockRow | null>(null);

  const canDeactivate = canDeactivateProduct(permissions);

  const pageSubtotals = useMemo(() => {
    const onHand = items.reduce((sum, r) => sum + Number(r.onHand), 0);
    const available = items.reduce((sum, r) => sum + Number(r.available), 0);
    return { onHand, available };
  }, [items]);

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
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load products");
    }
  }, [debouncedQ, categoryId, stockStatus, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (row: StockRow) => {
    const res = await fetch(`/api/proxy/products/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      toastError(parseApiMessage(data, "Could not deactivate"));
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
        const variant =
          label === "OUT of Stock" ? "danger" : label === "Low" ? "warning" : "success";
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <ActionGroup>
          <Link href={`/products/${row.id}/edit`}>
            <IconButton variant="secondary" aria-label="Edit product" icon={<Pencil />} />
          </Link>
          <IconButton
            variant="secondary"
            aria-label="Stock history"
            title="History"
            icon={<History />}
            onClick={() => setHistoryProduct({ id: row.id, name: row.name })}
          />
          {canDeactivate ? (
            <IconButton
              variant="danger"
              aria-label="Deactivate product"
              title="Deactivate"
              icon={<Trash2 />}
              onClick={() => setDeactivateRow(row)}
            />
          ) : null}
        </ActionGroup>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stocks"
        description="Receive inventory and manage product stock levels."
        actions={
          <Button type="button" icon={<Plus />} onClick={() => setPickerOpen(true)}>
            Add stock
          </Button>
        }
      />

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

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        footer={{
          label: "Page subtotal",
          cells: {
            onHand: pageSubtotals.onHand.toString(),
            available: pageSubtotals.available.toString(),
          },
        }}
        emptyMessage="No products match your filters."
        mobileCard={(row) => (
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{row.name}</p>
                <p className="text-xs text-white/50">
                  {row.category.name} · On hand {row.onHand}
                </p>
              </div>
              <Badge
                variant={
                  stockLabel(row) === "OUT of Stock"
                    ? "danger"
                    : stockLabel(row) === "Low"
                      ? "warning"
                      : "success"
                }
              >
                {stockLabel(row)}
              </Badge>
            </div>
            <ActionGroup className="justify-start">
              <Link href={`/products/${row.id}/edit`}>
                <IconButton variant="secondary" aria-label="Edit" icon={<Pencil />} />
              </Link>
              <IconButton
                variant="secondary"
                aria-label="History"
                icon={<History />}
                onClick={() => setHistoryProduct({ id: row.id, name: row.name })}
              />
              {canDeactivate ? (
                <IconButton
                  variant="danger"
                  aria-label="Deactivate"
                  icon={<Trash2 />}
                  onClick={() => setDeactivateRow(row)}
                />
              ) : null}
            </ActionGroup>
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

      <ConfirmDialog
        open={Boolean(deactivateRow)}
        title="Deactivate product"
        message={
          deactivateRow
            ? `"${deactivateRow.name}" will be hidden from the catalog.`
            : ""
        }
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={async () => {
          if (deactivateRow) {
            await handleDeactivate(deactivateRow);
            setDeactivateRow(null);
          }
        }}
        onCancel={() => setDeactivateRow(null)}
      />
    </div>
  );
};
