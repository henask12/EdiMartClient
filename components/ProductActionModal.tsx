"use client";

import { FormEvent, useEffect, useState } from "react";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const [reservationEndDate, setReservationEndDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proofPaths, setProofPaths] = useState<string[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQuantity("1");
    setCustomerName("");
    setReservationEndDate("");
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
            expiresAt: reservationEndDate || undefined,
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] p-6 shadow-xl"
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
          <Input
            required
            type="number"
            min={0.01}
            step="any"
            max={Number(product.available)}
            label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          {mode === "sell" ? (
            <PaymentProofUpload
              proofPreviews={proofPreviews}
              uploading={uploadingProof}
              onUpload={(files) => void handleProofUpload(files)}
              onRemove={handleRemoveProof}
            />
          ) : (
            <>
              <Input
                label="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Reservation end date (optional)"
                type="date"
                value={reservationEndDate}
                onChange={(e) => setReservationEndDate(e.target.value)}
              />
            </>
          )}

          {status ? <p className="text-sm text-rose-200">{status}</p> : null}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth disabled={loading || uploadingProof}>
              {loading ? "…" : mode === "sell" ? "Confirm sale" : "Reserve"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
