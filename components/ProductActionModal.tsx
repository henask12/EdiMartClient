"use client";

import { FormEvent, useState } from "react";
import { formatBirr } from "@/lib/format-price";
import type { MartProduct } from "./ProductCard";

type Mode = "sell" | "reserve";

type Props = {
  mode: Mode;
  product: MartProduct | null;
  onClose: () => void;
  onSuccess: () => void;
};

export const ProductActionModal = ({ mode, product, onClose, onSuccess }: Props) => {
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
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
      if (mode === "sell") {
        const res = await fetch("/api/proxy/sales/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lines: [{ productId: product.id, quantity }],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(typeof data.message === "string" ? data.message : "Sale failed");
          return;
        }
      } else {
        const res = await fetch("/api/proxy/reservations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            quantity,
            customerName: customerName.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(typeof data.message === "string" ? data.message : "Reserve failed");
          return;
        }
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
      aria-labelledby="action-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="action-title" className="text-lg font-semibold text-white">
          {mode === "sell" ? "Sell" : "Reserve"} — {product.name}
        </h2>
        <p className="mt-1 text-sm text-white/55">
          {product.available} available · {formatBirr(product.sellingPrice)} each
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-white/70">
            Quantity
            <input
              required
              type="number"
              min={0.01}
              step="any"
              max={Number(product.available)}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
            />
          </label>
          {mode === "reserve" ? (
            <label className="block text-sm text-white/70">
              Customer name (optional)
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
              />
            </label>
          ) : null}
          {status ? <p className="text-sm text-rose-200">{status}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="tap btn-primary flex-1 px-4 py-3 text-sm"
            >
              {loading ? "…" : mode === "sell" ? "Confirm sale" : "Reserve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
