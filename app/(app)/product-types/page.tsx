"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CategoryProductsModal } from "@/components/CategoryProductsModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Check, Eye, Pencil, Trash2, X } from "@/lib/icons";
import { parseApiMessage, toastError } from "@/lib/toast";

type ProductType = {
  id: string;
  name: string;
  _count: { products: number };
};

export default function ProductTypesPage() {
  const [items, setItems] = useState<ProductType[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewType, setViewType] = useState<ProductType | null>(null);
  const [deleteType, setDeleteType] = useState<ProductType | null>(null);

  const total = items.length;
  const pagedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const load = async () => {
    const res = await fetch("/api/proxy/product-types", { cache: "no-store" });
    if (res.ok) setItems((await res.json()) as ProductType[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/proxy/product-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(parseApiMessage(data, "Could not create"));
      return;
    }
    setName("");
    await load();
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/proxy/product-types/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) {
      setError("Could not update");
      return;
    }
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/proxy/product-types/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(parseApiMessage(data, "Could not delete"));
      return;
    }
    await load();
  };

  const columns: DataTableColumn<ProductType>[] = [
    {
      key: "name",
      header: "Name",
      render: (t) =>
        editingId === t.id ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            containerClassName="max-w-xs"
            aria-label="Type name"
          />
        ) : (
          <span className="font-medium text-text">{t.name}</span>
        ),
    },
    {
      key: "count",
      header: "Products",
      className: "tabular-nums",
      render: (t) => (
        <button
          type="button"
          onClick={() => setViewType(t)}
          className="tap text-primary underline-offset-2 hover:underline"
          disabled={t._count.products === 0}
        >
          {t._count.products}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (t) => (
        <ActionGroup>
          {t._count.products > 0 ? (
            <IconButton
              variant="secondary"
              aria-label="View products"
              title="View"
              icon={<Eye />}
              onClick={() => setViewType(t)}
            />
          ) : null}
          {editingId === t.id ? (
            <>
              <IconButton
                variant="primary"
                aria-label="Save"
                title="Save"
                icon={<Check />}
                onClick={() => void handleUpdate(t.id)}
              />
              <IconButton
                variant="ghost"
                aria-label="Cancel edit"
                title="Cancel"
                icon={<X />}
                onClick={() => setEditingId(null)}
              />
            </>
          ) : (
            <>
              <IconButton
                variant="secondary"
                aria-label="Edit type"
                title="Edit"
                icon={<Pencil />}
                onClick={() => {
                  setEditingId(t.id);
                  setEditName(t.name);
                }}
              />
              <IconButton
                variant="danger"
                aria-label="Delete type"
                title="Delete"
                icon={<Trash2 />}
                onClick={() => setDeleteType(t)}
              />
            </>
          )}
        </ActionGroup>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/categories" className="text-sm text-primary">
          Categories
        </Link>
        <PageHeader title="Product types" description="Food, Beverage, Merchandise, etc." />
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="flex gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
      >
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New type name"
          label="New type"
          containerClassName="flex-1"
        />
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Add
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable columns={columns} rows={pagedItems} rowKey={(t) => t.id} />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[10, 15, 25, 50]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <CategoryProductsModal
        title={viewType?.name ?? ""}
        filterParam="productTypeId"
        filterId={viewType?.id ?? null}
        onClose={() => setViewType(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteType)}
        title="Delete product type"
        message={
          deleteType
            ? `Delete "${deleteType.name}"? Products using this type will need updating.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (deleteType) {
            await handleDelete(deleteType.id);
            setDeleteType(null);
          }
        }}
        onCancel={() => setDeleteType(null)}
      />
    </div>
  );
}
