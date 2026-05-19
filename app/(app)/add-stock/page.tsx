"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DateInput } from "@/components/DateInput";
import { Pagination } from "@/components/Pagination";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  onHand: string;
  category: { id: string; name: string };
};
type Batch = {
  id: string;
  qtyReceived: string;
  unitCost: string;
  expiryDate: string | null;
  receivedAt: string;
};

const BATCH_PAGE = 10;

export default function AddStockPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchPage, setBatchPage] = useState(1);

  const selectedProduct = products.find((p) => p.id === productId);
  const prevOnHand = Number(selectedProduct?.onHand ?? 0);
  const addQty = Number(quantity) || 0;
  const totalAfter = prevOnHand + addQty;

  const loadBatches = async (pid: string) => {
    const res = await fetch(`/api/proxy/stock/batches?productId=${pid}&take=50`, { cache: "no-store" });
    if (res.ok) setBatches((await res.json()) as Batch[]);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("productId");
    if (preselect) setProductId(preselect);
    void fetch("/api/proxy/categories", { cache: "no-store" }).then(async (res) => {
      if (res.ok) setCategories((await res.json()) as Category[]);
    });
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setProducts([]);
      return;
    }
    void fetch(`/api/proxy/products?categoryId=${categoryId}&take=200`, { cache: "no-store" }).then(
      async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { items: Product[] };
          setProducts(data.items);
        }
      },
    );
  }, [categoryId]);

  useEffect(() => {
    if (!productId) return;
    void loadBatches(productId);
    const p = products.find((x) => x.id === productId);
    if (p && !unitCost) setUnitCost(p.costPrice);
  }, [productId, products, unitCost]);

  useEffect(() => {
    if (!productId || products.length) return;
    void fetch(`/api/proxy/products/${productId}`, { cache: "no-store" }).then(async (res) => {
      if (res.ok) {
        const p = (await res.json()) as Product;
        setCategoryId(p.category.id);
        setProducts([p]);
        setUnitCost(p.costPrice);
      }
    });
  }, [productId, products.length]);

  const batchSlice = useMemo(() => {
    const start = (batchPage - 1) * BATCH_PAGE;
    return batches.slice(start, start + BATCH_PAGE);
  }, [batches, batchPage]);

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
        notes: notes ? `${notes} (receipt ${receiptDate})` : `Receipt ${receiptDate}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(typeof data.message === "string" ? data.message : "Could not add stock");
      return;
    }
    setStatus("Stock received");
    const prodRes = await fetch(`/api/proxy/products/${productId}`, { cache: "no-store" });
    if (prodRes.ok) {
      const updated = (await prodRes.json()) as Product;
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...updated } : p)));
    }
    await loadBatches(productId);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Add stock</h1>
        <p className="mt-2 text-sm text-white/60">Previous qty, amount added, and total after receive.</p>
      </header>

      <form onSubmit={handleReceive} className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5">
        <label className="block text-sm text-white/70">
          Category
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setProductId("");
            }}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-white"
          >
            <option value="">Choose category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-white/70">
          Product
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
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
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/5 p-4 text-sm">
            <div>
              <p className="text-white/50">Previous on hand</p>
              <p className="text-lg font-semibold tabular-nums text-white">{prevOnHand}</p>
            </div>
            <div>
              <p className="text-white/50">Adding</p>
              <p className="text-lg font-semibold tabular-nums text-[var(--accent)]">{addQty}</p>
            </div>
            <div>
              <p className="text-white/50">Total after</p>
              <p className="text-lg font-semibold tabular-nums text-white">{totalAfter}</p>
            </div>
            <div>
              <p className="text-white/50">Selling price</p>
              <p className="text-lg font-semibold tabular-nums text-white">{selectedProduct.sellingPrice}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-white/70">
            Quantity to add
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
        <DateInput label="Receipt date" value={receiptDate} onChange={setReceiptDate} />
        <DateInput
          label="Batch expiry (optional)"
          value={expiryDate}
          onChange={setExpiryDate}
          required={false}
        />
        <label className="text-sm text-white/70">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {status ? (
          <p className={`text-sm ${status.includes("received") ? "text-[var(--accent)]" : "text-rose-200"}`}>
            {status}
          </p>
        ) : null}
        <button type="submit" className="tap btn-primary w-full px-4 py-3 text-sm">
          Receive stock
        </button>
      </form>

      {productId && batches.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Receipt history</h2>
          <ul className="space-y-2 lg:hidden">
            {batchSlice.map((b) => (
              <li key={b.id} className="rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-3 text-xs">
                <p className="font-medium text-white">{b.receivedAt.slice(0, 10)}</p>
                <p className="mt-1 text-white/60">
                  Qty {b.qtyReceived} · Cost {b.unitCost} · Exp {b.expiryDate?.slice(0, 10) ?? "—"}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="border-b border-white/10 bg-black/30 text-white/50">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit cost</th>
                  <th className="px-3 py-2">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {batchSlice.map((b) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="px-3 py-2">{b.receivedAt.slice(0, 10)}</td>
                    <td className="px-3 py-2 tabular-nums">{b.qtyReceived}</td>
                    <td className="px-3 py-2 tabular-nums">{b.unitCost}</td>
                    <td className="px-3 py-2">{b.expiryDate?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={batchPage} pageSize={BATCH_PAGE} total={batches.length} onPageChange={setBatchPage} />
        </section>
      ) : null}
    </div>
  );
}
