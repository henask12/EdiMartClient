"use client";

import { FormEvent, useState } from "react";
import { DateInput } from "@/components/DateInput";
import type { MartProduct } from "./ProductCard";

type Props = {
  product: MartProduct | null;
  onClose: () => void;
  onSuccess: () => void;
};

export const RestockModal = ({ product, onClose, onSuccess }: Props) => {
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!product) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/proxy/stock/receive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          unitCost: unitCost || product.costPrice || "0",
          expiryDate: expiryDate || undefined,
          notes: "Restock",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data.message === "string" ? data.message : "Restock failed");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--brand-yellow)]/20 bg-[color:var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Restock — {product.name}</h2>
        <p className="mt-1 text-sm text-white/55">
          {product.onHand} on hand · alert below {product.restockAt}
          {product.restockQty ? ` · suggest +${product.restockQty}` : ""}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-white/70">
            Quantity to add
            <input
              required
              type="number"
              min={0.01}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={product.restockQty ? String(product.restockQty) : "e.g. 24"}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          {product.restockQty ? (
            <button
              type="button"
              onClick={() => setQuantity(String(product.restockQty))}
              className="text-xs font-semibold text-[var(--accent)]"
            >
              Use suggested reorder ({product.restockQty})
            </button>
          ) : null}
          <label className="block text-sm text-white/70">
            Cost each
            <input
              type="number"
              min={0}
              step="any"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder={product.costPrice ?? "0"}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <DateInput
            label="Expiry (optional)"
            value={expiryDate}
            onChange={setExpiryDate}
            required={false}
          />
          {status ? <p className="text-sm text-rose-200">{status}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="tap btn-primary flex-1 px-4 py-3 text-sm">
              {loading ? "…" : "Add stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
