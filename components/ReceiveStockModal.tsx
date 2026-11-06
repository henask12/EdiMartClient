"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="receive-stock-title" className="text-lg font-semibold text-text">
              Add stock
            </h2>
            <p className="mt-1 text-sm text-text-muted">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-full border border-border px-3 py-1 text-sm text-text-muted"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm">
            <div>
              <p className="text-text-muted">Previous on hand</p>
              <p className="text-lg font-semibold tabular-nums text-text">{prevOnHand}</p>
            </div>
            <div>
              <p className="text-text-muted">Adding</p>
              <p className="text-lg font-semibold tabular-nums text-accent">{addQty}</p>
            </div>
            <div>
              <p className="text-text-muted">Total after</p>
              <p className="text-lg font-semibold tabular-nums text-text">{totalAfter}</p>
            </div>
            <div>
              <p className="text-text-muted">Selling price</p>
              <p className="text-lg font-semibold tabular-nums text-text">{product.sellingPrice}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-text-muted">
              Quantity to add
              <input
                required
                type="number"
                min={0.01}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-text"
              />
            </label>
            <label className="text-sm text-text-muted">
              Cost each
              <input
                type="number"
                min={0}
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-text"
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
          <label className="block text-sm text-text-muted">
            Notes
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-text"
            />
          </label>

          {status ? <p className="text-sm text-danger">{status}</p> : null}

          <Button type="submit" disabled={busy} fullWidth>
            {busy ? "Receiving…" : "Receive stock"}
          </Button>
        </form>
      </div>
    </div>
  );
};
