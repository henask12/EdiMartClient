"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { ProductSelect, type ProductOption } from "@/components/ProductSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
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
    if (!productId) {
      toastError("Choose a product");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toastError("Enter a valid quantity");
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
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Sell"
        description="Record a sale and attach payment proof screenshots."
      />

      <section className="section-card space-y-4">
        <ProductSelect value={productId} onChange={setProductId} />
        <Input
          type="number"
          min={1}
          step="1"
          label="Quantity sold"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Button type="button" variant="secondary" fullWidth onClick={() => void handleAddLine()}>
          Add to sale
        </Button>
      </section>

      <section className="section-card space-y-3">
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
              <li
                key={url}
                className="relative h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-white/10"
              >
                <Image src={url} alt="Payment proof" fill className="object-cover" unoptimized />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {lines.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="section-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">This sale</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.productId} className="flex items-center justify-between text-sm text-white">
                  <span>
                    {l.name} × {l.quantity}
                  </span>
                  <span className="tabular-nums font-medium">
                    {(l.unitPrice * l.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-semibold text-white">
              <span>Total</span>
              <span className="tabular-nums">{total.toFixed(2)}</span>
            </div>
          </section>
          <Button type="submit" fullWidth>
            Record sale
          </Button>
        </form>
      ) : null}

      {receipt ? (
        <section className="section-card">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">Receipt</h2>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-white/80">{receipt}</pre>
        </section>
      ) : null}
    </section>
  );
}
