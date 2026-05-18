"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  costPrice: string;
  category: { id: string; name: string };
};

export default function AddStockPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/proxy/categories", { cache: "no-store" });
      if (res.ok) {
        setCategories((await res.json()) as Category[]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setProducts([]);
      return;
    }
    const load = async () => {
      const res = await fetch(
        `/api/proxy/products?categoryId=${categoryId}&take=200`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json()) as { items: Product[] };
        setProducts(data.items);
        setProductId("");
      }
    };
    void load();
  }, [categoryId]);

  const handleReceive = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!productId) {
      setStatus("Choose a product");
      return;
    }
    const res = await fetch("/api/proxy/stock/receive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity,
        unitCost: unitCost || "0",
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(typeof data.message === "string" ? data.message : "Could not add stock");
      return;
    }
    setStatus("Stock received — recorded in history");
    setQuantity("1");
    setExpiryDate("");
    setNotes("");
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Add stock</h1>
        <p className="mt-2 text-sm text-white/60">
          Category → product → quantity. Every receipt is logged.
        </p>
      </div>

      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-white/45">
        <span className={step === 1 ? "text-[var(--accent)]" : ""}>1. Category</span>
        <span>→</span>
        <span className={step === 2 ? "text-[var(--accent)]" : ""}>2. Product & qty</span>
      </div>

      {step === 1 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id);
                setStep(2);
              }}
              className={`tap rounded-2xl border px-5 py-6 text-left transition ${
                categoryId === c.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-white/10 bg-[color:var(--surface)]/80 hover:border-white/20"
              }`}
            >
              <span className="text-lg font-semibold text-white">{c.name}</span>
            </button>
          ))}
          {categories.length === 0 ? (
            <p className="text-sm text-white/50">Add categories first.</p>
          ) : null}
        </section>
      ) : (
        <form
          onSubmit={handleReceive}
          className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              Category: <span className="font-medium text-white">{selectedCategory?.name}</span>
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-[var(--accent-2)]"
            >
              Change
            </button>
          </div>
          <label className="block text-sm text-white/70">
            Product
            <select
              required
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p && !unitCost) {
                  setUnitCost(p.costPrice);
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-white"
            >
              <option value="">Choose product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {selectedProduct ? (
            <p className="text-xs text-white/45">{selectedProduct.category.name}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-white/70">
              Quantity
              <input
                required
                type="number"
                min={0.01}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Cost each
              <input
                type="number"
                min={0}
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>
          <label className="text-sm text-white/70">
            Expiry date (optional)
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-white/70">
            Notes
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          {status ? (
            <p
              className={`text-sm ${status.includes("received") ? "text-[var(--accent)]" : "text-rose-200"}`}
            >
              {status}
            </p>
          ) : null}
          <button
            type="submit"
            className="tap btn-primary w-full px-4 py-3 text-sm"
          >
            Receive stock
          </button>
        </form>
      )}
    </div>
  );
}
