"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ProductActionModal } from "@/components/ProductActionModal";
import { ProductCard, type MartProduct } from "@/components/ProductCard";
import { RestockModal } from "@/components/RestockModal";
import { dedupeCategories } from "@/lib/dedupe-categories";

type Category = { id: string; name: string };
type ProductType = { id: string; name: string };
type Me = { role: string };

const STOCK_FILTERS = [
  { value: "", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low", label: "Low" },
  { value: "out", label: "OUT of Stock" },
] as const;

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

  const canEdit = me?.role === "OWNER" || me?.role === "STORE_STAFF";
  const canStock = canEdit;

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

  const exportParams = {
    q: debouncedQ || undefined,
    categoryId: categoryId || undefined,
    productTypeId: productTypeId || undefined,
    stockStatus: stockStatus || undefined,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="mt-1 text-sm text-white/60">Search, sell, restock, and export.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/products/new" className="tap btn-primary justify-center px-5 py-3 text-sm">
            Add product
          </Link>
          {canStock ? (
            <Link
              href="/add-stock"
              className="tap justify-center rounded-full border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-5 py-3 text-center text-sm font-semibold text-[var(--accent)]"
            >
              Add stock
            </Link>
          ) : null}
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Search name or SKU…"
        className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCategoryId("");
            setPage(1);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            !categoryId ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]" : "bg-white/5 text-white/60"
          }`}
        >
          All categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategoryId(c.id);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              categoryId === c.id
                ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]"
                : "bg-white/5 text-white/60"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setProductTypeId("");
            setPage(1);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            !productTypeId ? "bg-white/10 text-white" : "bg-white/5 text-white/60"
          }`}
        >
          All types
        </button>
        {productTypes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setProductTypeId(t.id);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              productTypeId === t.id ? "bg-white/10 text-white" : "bg-white/5 text-white/60"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STOCK_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStockStatus(f.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              stockStatus === f.value ? "bg-rose-500/20 text-rose-100" : "bg-white/5 text-white/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ExportMenu basePath="products/export" queryParams={exportParams} />

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            canEdit={canEdit}
            onSell={(product) => setModal({ mode: "sell", product })}
            onReserve={(product) => setModal({ mode: "reserve", product })}
            onRestock={canStock ? setRestockProduct : undefined}
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
};
