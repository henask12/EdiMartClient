"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ProductActionModal } from "@/components/ProductActionModal";
import { ProductCard, type MartProduct } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { RestockModal } from "@/components/RestockModal";
import { dedupeCategories } from "@/lib/dedupe-categories";
import { canCreateProduct, canDeactivateProduct, canReceiveStock } from "@/lib/product-permissions";

type Category = { id: string; name: string };
type ProductType = { id: string; name: string };
type Me = { role: string; permissions: string[] };

export default function ProductsPage() {
  const [items, setItems] = useState<MartProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
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
      if (productTypeId) params.set("productTypeId", productTypeId);
      if (stockStatus) params.set("stockStatus", stockStatus);

      const [prodRes, catRes, typeRes] = await Promise.all([
        fetch(`/api/proxy/products?${params}`, { cache: "no-store" }),
        fetch("/api/proxy/categories", { cache: "no-store" }),
        fetch("/api/proxy/product-types", { cache: "no-store" }),
      ]);
      if (!prodRes.ok) throw new Error("Failed to load products");
      const data = (await prodRes.json()) as { items: MartProduct[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      if (catRes.ok) {
        setCategories(dedupeCategories((await catRes.json()) as Category[]));
      }
      if (typeRes.ok) setProductTypes((await typeRes.json()) as ProductType[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [debouncedQ, categoryId, productTypeId, stockStatus, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (productId: string) => {
    if (!confirm("Deactivate this product? It will be hidden from the catalog.")) return;
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
    productTypeId: productTypeId || undefined,
    stockStatus: stockStatus || undefined,
  };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="mt-1 text-sm text-white/60">
            Tap a card for details and actions. Use filters to narrow the list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAddProduct ? (
            <Link href="/products/new" className="tap btn-primary px-5 py-2.5 text-sm">
              Add product
            </Link>
          ) : null}
          {canStock ? (
            <Link
              href="/add-stock"
              className="tap rounded-full border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--accent)]"
            >
              Add stock
            </Link>
          ) : null}
        </div>
      </div>

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
        productTypes={productTypes}
        productTypeId={productTypeId}
        onProductTypeChange={(id) => {
          setProductTypeId(id);
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
    </div>
  );
}
