"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { ProductActionModal } from "@/components/ProductActionModal";
import { ProductCard, type MartProduct } from "@/components/ProductCard";
import { RestockModal } from "@/components/RestockModal";

const PAGE_SIZE = 12;

type Category = { id: string; name: string };

export default function ProductsPage() {
  const [items, setItems] = useState<MartProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "sell" | "reserve"; product: MartProduct } | null>(
    null,
  );
  const [restockProduct, setRestockProduct] = useState<MartProduct | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(PAGE_SIZE),
        skip: String((page - 1) * PAGE_SIZE),
      });
      if (q) {
        params.set("q", q);
      }
      if (categoryId) {
        params.set("categoryId", categoryId);
      }
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/proxy/products?${params}`, { cache: "no-store" }),
        fetch("/api/proxy/categories", { cache: "no-store" }),
      ]);
      if (!prodRes.ok) {
        throw new Error("Failed to load products");
      }
      const data = (await prodRes.json()) as { items: MartProduct[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      if (catRes.ok) {
        setCategories((await catRes.json()) as Category[]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [q, categoryId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setPage(1);
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="mt-2 text-sm text-white/60">
            Sell, reserve, or restock from each card.
          </p>
        </div>
        <Link href="/products/new" className="tap btn-primary inline-flex justify-center px-5 py-3 text-sm">
          Add product
        </Link>
      </div>

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
          All
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

      <div className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Search by name…"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
        >
          Search
        </button>
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onSell={(product) => setModal({ mode: "sell", product })}
            onReserve={(product) => setModal({ mode: "reserve", product })}
            onRestock={setRestockProduct}
          />
        ))}
      </div>

      {items.length === 0 && !error ? (
        <p className="text-center text-sm text-white/50">No products yet.</p>
      ) : null}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

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
