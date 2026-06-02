"use client";

import { FormEvent, useState } from "react";
import { DateInput } from "@/components/DateInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--brand-yellow)]/20 bg-[color:var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Restock — {product.name}</h2>
        <p className="mt-1 text-sm text-white/55">
          {product.onHand} on hand · alert below {product.restockAt}
          {product.restockQty ? ` · suggest +${product.restockQty}` : ""}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input
            required
            type="number"
            min={0.01}
            step="any"
            label="Quantity to add"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={product.restockQty ? String(product.restockQty) : "e.g. 24"}
          />
          {product.restockQty ? (
            <button
              type="button"
              onClick={() => setQuantity(String(product.restockQty))}
              className="text-xs font-semibold text-[var(--accent)]"
            >
              Use suggested reorder ({product.restockQty})
            </button>
          ) : null}
          <Input
            type="number"
            min={0}
            step="any"
            label="Cost each"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder={product.costPrice ?? "0"}
          />
          <DateInput
            label="Expiry (optional)"
            value={expiryDate}
            onChange={setExpiryDate}
            required={false}
          />
          {status ? <p className="text-sm text-rose-200">{status}</p> : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "…" : "Add stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
