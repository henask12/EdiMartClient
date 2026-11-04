"use client";

import Image from "next/image";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PaymentMethodField } from "@/components/PaymentMethodField";
import { ProductSelect, type ProductOption } from "@/components/ProductSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { newIdempotencyKey, shouldRotateKey } from "@/lib/idempotency";
import type { PaymentMethod } from "@/lib/payment-methods";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export default function SellPage() {
  const t = useTranslations("Sell");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [proofPaths, setProofPaths] = useState<string[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const attemptKey = useRef(newIdempotencyKey());

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
        const res = await fetch("/api/proxy/uploads/sale-proof", {
          method: "POST",
          body: fd,
        });
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
      toastError(t("chooseProduct"));
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toastError("Enter a valid quantity");
      return;
    }
    let list = products;
    if (!list.length) {
      const res = await fetch("/api/proxy/products?take=200", {
        cache: "no-store",
      });
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
          l.productId === productId
            ? { ...l, quantity: l.quantity + qty }
            : l,
        );
      }
      return [
        ...prev,
        { productId, name: product.name, unitPrice: price, quantity: qty },
      ];
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
    if (submitting) return;
    setSubmitting(true);
    let res: Response;
    try {
      res = await fetch("/api/proxy/sales/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": attemptKey.current,
        },
        body: JSON.stringify({
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: String(l.quantity),
          })),
          proofImagePaths: proofPaths.length ? proofPaths : undefined,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
        }),
      });
    } catch {
      toastError(t("noConnection"));
      setSubmitting(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      if (shouldRotateKey(res.status))
        attemptKey.current = newIdempotencyKey();
      toastError(parseApiMessage(data, t("couldNotRecord")));
      return;
    }
    attemptKey.current = newIdempotencyKey();
    setPaymentMethod("CASH");
    setPaymentReference("");
    toastSuccess(t("saleRecorded"));
    setReceipt((data.digitalReceipt as string) ?? t("saleRecorded"));
    setLines([]);
    setProofPaths([]);
    setProofPreviews([]);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <div className="space-y-4">
          <ProductSelect value={productId} onChange={setProductId} />
          <Input
            type="number"
            min={1}
            step="1"
            label={t("quantitySold")}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleAddLine()}
          >
            {t("addToSale")}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-muted">
          {t("paymentProof")}
        </h2>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={uploading}
          onChange={(e) => void handleProofUpload(e.target.files)}
          className="mt-3 w-full text-sm text-text-muted"
        />
        {proofPreviews.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {proofPreviews.map((url) => (
              <li
                key={url}
                className="relative size-16 overflow-hidden rounded-lg border border-border"
              >
                <Image
                  src={url}
                  alt="Payment proof"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {lines.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t("thisSale")}
            </h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li
                  key={l.productId}
                  className="flex items-center justify-between text-sm text-text"
                >
                  <span>
                    {l.name} × {l.quantity}
                  </span>
                  <span className="tabular-nums font-medium">
                    {(l.unitPrice * l.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-semibold text-text">
              <span>{t("total")}</span>
              <span className="tabular-nums">{total.toFixed(2)}</span>
            </div>
          </Card>

          <Card>
            <PaymentMethodField
              method={paymentMethod}
              onMethodChange={setPaymentMethod}
              reference={paymentReference}
              onReferenceChange={setPaymentReference}
            />
          </Card>

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? t("recording") : t("recordSale")}
          </Button>
        </form>
      ) : null}

      {receipt ? (
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("receipt")}
          </h2>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-text">
            {receipt}
          </pre>
        </Card>
      ) : null}
    </section>
  );
}
