"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ProductActionModal } from "@/components/ProductActionModal";
import { ProductCard, type MartProduct } from "@/components/ProductCard";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { ProductFilters } from "@/components/ProductFilters";
import { RestockModal } from "@/components/RestockModal";
import { dedupeCategories } from "@/lib/dedupe-categories";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { canCreateProduct, canDeactivateProduct, canReceiveStock } from "@/lib/product-permissions";

type Category = { id: string; name: string };
type Me = { role: string; permissions: string[] };

export default function ProductsPage() {
  const [items, setItems] = useState<MartProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "sell" | "reserve"; product: MartProduct } | null>(
    null,
  );
  const [restockProduct, setRestockProduct] = useState<MartProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<MartProduct | null>(null);

  const permissions = me?.permissions ?? [];
  const canStock = canReceiveStock(permissions);
  const canAddProduct = canCreateProduct(permissions);
  const canDeactivate = canDeactivateProduct(permissions);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    void fetch("/api/proxy/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data as Me | null));
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

      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/proxy/products?${params}`, { cache: "no-store" }),
        fetch("/api/proxy/categories", { cache: "no-store" }),
      ]);
      if (!prodRes.ok) throw new Error("Failed to load products");
      const data = (await prodRes.json()) as { items: MartProduct[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      if (catRes.ok) {
        setCategories(dedupeCategories((await catRes.json()) as Category[]));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [debouncedQ, categoryId, stockStatus, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (productId: string) => {
    const res = await fetch(`/api/proxy/products/${productId}`, {
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

  const exportParams = {
    q: debouncedQ || undefined,
    categoryId: categoryId || undefined,
    stockStatus: stockStatus || undefined,
  };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Tap a card for details and actions. Use filters to narrow the list."
        actions={
          <>
            {canAddProduct ? (
              <Link href="/products/new">
                <Button type="button" size="sm">
                  Add product
                </Button>
              </Link>
            ) : null}
            {canStock ? (
              <Link href="/add-stock">
                <Button type="button" variant="secondary" size="sm">
                  Stocks
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <ProductFilters
        q={q}
        onQChange={(value) => {
          setQ(value);
          resetPage();
        }}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={(id) => {
          setCategoryId(id);
          resetPage();
        }}
        stockStatus={stockStatus}
        onStockStatusChange={(value) => {
          setStockStatus(value);
          resetPage();
        }}
        exportBasePath="products/export"
        exportParams={exportParams}
      />

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <p className="text-xs text-white/45">
        {total} product{total === 1 ? "" : "s"}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            permissions={permissions}
            onOpenDetail={setDetailProduct}
            onSell={(product) => setModal({ mode: "sell", product })}
            onReserve={(product) => setModal({ mode: "reserve", product })}
            onRestock={canStock ? setRestockProduct : undefined}
            onDeactivate={canDeactivate ? handleDeactivate : undefined}
          />
        ))}
      </div>

      {items.length === 0 && !error ? (
        <p className="text-center text-sm text-white/50">No products match your filters.</p>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <ProductActionModal
        mode={modal?.mode ?? "sell"}
        product={modal?.product ?? null}
        onClose={() => setModal(null)}
        onSuccess={load}
      />
      <RestockModal
        product={restockProduct}
        onClose={() => setRestockProduct(null)}
        onSuccess={load}
      />
      <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />
    </div>
  );
}
