"use client";

import { FormEvent, useEffect, useState } from "react";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
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
  const [proofPaths, setProofPaths] = useState<string[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQuantity("1");
    setCustomerName("");
    setStatus(null);
    setProofPaths([]);
    setProofPreviews([]);
  }, [product?.id, mode]);

  if (!product) {
    return null;
  }

  const handleProofUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingProof(true);
    setStatus(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/proxy/uploads/sale-proof", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(typeof data.message === "string" ? data.message : "Proof upload failed");
          return;
        }
        const path = data.path as string;
        const url = data.url as string;
        setProofPaths((prev) => [...prev, path]);
        setProofPreviews((prev) => [...prev, url]);
      }
    } finally {
      setUploadingProof(false);
    }
  };

  const handleRemoveProof = (index: number) => {
    setProofPaths((prev) => prev.filter((_, i) => i !== index));
    setProofPreviews((prev) => prev.filter((_, i) => i !== index));
  };

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
            proofImagePaths: proofPaths.length ? proofPaths : undefined,
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

  const lineTotal = Number(product.sellingPrice) * (Number(quantity) || 0);

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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="action-title" className="text-lg font-semibold text-white">
          {mode === "sell" ? "Sell" : "Reserve"} — {product.name}
        </h2>
        <p className="mt-1 text-sm text-white/55">
          {product.available} available · {formatBirr(product.sellingPrice)} each
          {mode === "sell" && Number(quantity) > 0 ? (
            <span className="text-white/70"> · Total {formatBirr(String(lineTotal))}</span>
          ) : null}
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

          {mode === "sell" ? (
            <PaymentProofUpload
              proofPreviews={proofPreviews}
              uploading={uploadingProof}
              onUpload={(files) => void handleProofUpload(files)}
              onRemove={handleRemoveProof}
            />
          ) : (
            <label className="block text-sm text-white/70">
              Customer name (optional)
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}

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
              disabled={loading || uploadingProof}
              className="tap btn-primary flex-1 px-4 py-3 text-sm disabled:opacity-50"
            >
              {loading ? "…" : mode === "sell" ? "Confirm sale" : "Reserve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
