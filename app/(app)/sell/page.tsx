"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { ProductSelect, type ProductOption } from "@/components/ProductSelect";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export default function SellPage() {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [proofPaths, setProofPaths] = useState<string[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );

  const handleProofUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/proxy/uploads/sale-proof", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toastError(parseApiMessage(data, "Proof upload failed"));
          return;
        }
        const path = data.path as string;
        const url = data.url as string;
        setProofPaths((prev) => [...prev, path]);
        setProofPreviews((prev) => [...prev, url]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddLine = async () => {
    setStatus(null);
    if (!productId) {
      setStatus("Choose a product");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setStatus("Enter a valid quantity");
      return;
    }
    let list = products;
    if (!list.length) {
      const res = await fetch("/api/proxy/products?take=200", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items: ProductOption[] };
        list = data.items;
        setProducts(list);
      }
    }
    const product = list.find((p) => p.id === productId);
    if (!product) {
      toastError("Product not found");
      return;
    }
    const price = Number(product.sellingPrice);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + qty } : l,
        );
      }
      return [...prev, { productId, name: product.name, unitPrice: price, quantity: qty }];
    });
    setProductId("");
    setQuantity("1");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setReceipt(null);
    if (!lines.length) {
      toastError("Add items to sell");
      return;
    }
    const res = await fetch("/api/proxy/sales/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: String(l.quantity),
        })),
        proofImagePaths: proofPaths.length ? proofPaths : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Could not record sale"));
      return;
    }
    toastSuccess("Sale recorded");
    setReceipt((data.digitalReceipt as string) ?? "Sale recorded");
    setLines([]);
    setProofPaths([]);
    setProofPreviews([]);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Sell</h1>
        <p className="mt-2 text-sm text-white/60">Record a sale and attach payment proof screenshots.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5">
        <ProductSelect value={productId} onChange={setProductId} />
        <label className="block text-sm text-white/70">
          Quantity sold
          <input
            type="number"
            min={1}
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-lg text-white outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="button"
          onClick={handleAddLine}
          className="tap w-full rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Add to sale
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5">
        <h2 className="text-sm font-semibold text-white/80">Payment proof (optional)</h2>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={uploading}
          onChange={(e) => void handleProofUpload(e.target.files)}
          className="w-full text-sm text-white/70"
        />
        {proofPreviews.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {proofPreviews.map((url) => (
              <li key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
                <Image src={url} alt="Payment proof" fill className="object-cover" unoptimized />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {lines.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[color:var(--surface-2)]/70 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">This sale</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.productId} className="flex items-center justify-between text-sm text-white">
                  <span>
                    {l.name} × {l.quantity}
                  </span>
                  <span className="tabular-nums font-medium">{(l.unitPrice * l.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-semibold text-white">
              <span>Total</span>
              <span className="tabular-nums">{total.toFixed(2)}</span>
            </div>
          </section>
          <button type="submit" className="tap btn-primary w-full px-4 py-4 text-base">
            Record sale
          </button>
        </form>
      ) : null}

      {receipt ? (
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">Receipt</h2>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-white/80">{receipt}</pre>
        </section>
      ) : null}
    </section>
  );
}
