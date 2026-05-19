"use client";

import { FormEvent, useEffect, useState } from "react";
import { DateInput } from "@/components/DateInput";

export type ReceiveStockProduct = {
  id: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  onHand: string;
};

type Props = {
  product: ReceiveStockProduct | null;
  onClose: () => void;
  onSuccess: () => void;
};

export const ReceiveStockModal = ({ product, onClose, onSuccess }: Props) => {
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQuantity("1");
    setUnitCost(product.costPrice);
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setExpiryDate("");
    setNotes("");
    setStatus(null);
  }, [product]);

  if (!product) return null;

  const prevOnHand = Number(product.onHand);
  const addQty = Number(quantity) || 0;
  const totalAfter = prevOnHand + addQty;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/proxy/stock/receive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        quantity,
        unitCost: unitCost || "0",
        expiryDate: expiryDate || undefined,
        notes: notes ? `${notes} (receipt ${receiptDate})` : `Receipt ${receiptDate}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setStatus(typeof data.message === "string" ? data.message : "Could not add stock");
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-stock-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--surface)] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="receive-stock-title" className="text-lg font-semibold text-white">
              Add stock
            </h2>
            <p className="mt-1 text-sm text-white/60">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-full border border-white/15 px-3 py-1 text-sm text-white/70"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
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
              <p className="text-lg font-semibold tabular-nums text-white">{product.sellingPrice}</p>
            </div>
          </div>

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
          <label className="block text-sm text-white/70">
            Notes
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>

          {status ? <p className="text-sm text-rose-200">{status}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="tap btn-primary w-full px-4 py-3 text-sm disabled:opacity-50"
          >
            {busy ? "Receiving…" : "Receive stock"}
          </button>
        </form>
      </div>
    </div>
  );
};
