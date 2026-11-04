"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format-money";
import {
  PAYMENT_METHODS,
  methodHasReference,
  type PaymentMethod,
} from "@/lib/payment-methods";
import {
  addMoney,
  compareMoney,
  isZeroMoney,
  moneyString,
  quickCashTenders,
  subMoney,
} from "@/lib/pos-money";
import type { PosPaymentLine } from "@/lib/pos-types";
import { parseApiMessage, toastError } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  amountDue: string;
  denominations: string[];
  submitting: boolean;
  onClose: () => void;
  onComplete: (payments: PosPaymentLine[]) => void;
};

const newPaymentId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const PosPaymentSheet = ({
  open,
  amountDue,
  denominations,
  submitting,
  onClose,
  onComplete,
}: Props) => {
  const t = useTranslations("Pos");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [reference, setReference] = useState("");
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [proofPaths, setProofPaths] = useState<string[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const paid = useMemo(
    () => payments.reduce((sum, p) => addMoney(sum, p.amount), "0.00"),
    [payments],
  );
  const remaining = subMoney(amountDue, paid);
  const changeDue =
    method === "CASH" && cashInput
      ? moneyString(Math.max(0, compareMoney(cashInput, remaining)))
      : payments.some((p) => p.method === "CASH") && compareMoney(paid, amountDue) > 0
        ? subMoney(paid, amountDue)
        : "0.00";

  const tenders = useMemo(
    () => quickCashTenders(remaining, denominations),
    [remaining, denominations],
  );

  const handleReset = () => {
    setMethod("CASH");
    setCashInput("");
    setReference("");
    setPayments([]);
    setProofPaths([]);
    setProofPreviews([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

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
          toastError(parseApiMessage(data, t("proofUploadFailed")));
          return;
        }
        setProofPaths((prev) => [...prev, data.path as string]);
        setProofPreviews((prev) => [...prev, data.url as string]);
      }
    } finally {
      setUploading(false);
    }
  };

  const appendPayment = (amount: string) => {
    if (compareMoney(amount, "0") <= 0) {
      toastError(t("enterAmount"));
      return;
    }
    let payAmount = moneyString(Number(amount));
    if (method !== "CASH" && compareMoney(payAmount, remaining) > 0) {
      payAmount = remaining;
    }
    const line: PosPaymentLine = {
      id: newPaymentId(),
      method,
      amount: payAmount,
      reference: reference.trim() || undefined,
      proofPaths: proofPaths.length ? [...proofPaths] : undefined,
      proofPreviews: proofPreviews.length ? [...proofPreviews] : undefined,
    };
    setPayments((prev) => [...prev, line]);
    setCashInput("");
    setReference("");
    setProofPaths([]);
    setProofPreviews([]);
  };

  const handleAddSplit = () => {
    const amount = method === "CASH" ? cashInput || remaining : cashInput || remaining;
    appendPayment(amount);
  };

  const handleComplete = () => {
    let finalPayments = payments;
    if (!finalPayments.length) {
      const amount = method === "CASH" ? cashInput || remaining : remaining;
      if (compareMoney(amount, "0") <= 0) {
        toastError(t("enterAmount"));
        return;
      }
      finalPayments = [
        {
          id: newPaymentId(),
          method,
          amount: method === "CASH" ? moneyString(Number(amount)) : remaining,
          reference: reference.trim() || undefined,
          proofPaths: proofPaths.length ? proofPaths : undefined,
        },
      ];
    }
    const totalPaid = finalPayments.reduce((s, p) => addMoney(s, p.amount), "0.00");
    if (compareMoney(totalPaid, amountDue) < 0) {
      toastError(t("balanceRemaining", { amount: formatMoney(subMoney(amountDue, totalPaid)) }));
      return;
    }
    onComplete(finalPayments);
  };

  const numpadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

  const handleNumpad = (key: string) => {
    if (key === "⌫") {
      setCashInput((v) => v.slice(0, -1));
      return;
    }
    if (key === "." && cashInput.includes(".")) return;
    setCashInput((v) => {
      const next = v + key;
      if (next.includes(".")) {
        const [, dec = ""] = next.split(".");
        if (dec.length > 2) return v;
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("payment")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-surface-muted px-4 py-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {t("amountDue")}
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-text sm:text-5xl">
              {formatMoney(remaining)}
            </p>
            {!isZeroMoney(paid) ? (
              <p className="mt-1 text-sm text-text-muted">
                {t("paidSoFar")}: {formatMoney(paid)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={cn(
                  "min-h-14 rounded-xl border px-3 py-2 text-sm font-semibold focus-ring",
                  method === m.value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-text hover:bg-surface-muted",
                )}
                aria-pressed={method === m.value}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === "CASH" ? (
            <div className="space-y-3">
              <Input
                label={t("tendered")}
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="text-lg tabular-nums"
              />
              <div className="grid grid-cols-3 gap-2">
                {numpadKeys.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="secondary"
                    size="pos"
                    onClick={() => handleNumpad(key)}
                    aria-label={key === "⌫" ? t("backspace") : key}
                  >
                    {key}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {tenders.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCashInput(amt)}
                  >
                    {amt === remaining || amt === amountDue
                      ? t("exact")
                      : formatMoney(amt)}
                  </Button>
                ))}
              </div>
              {cashInput && compareMoney(cashInput, remaining) >= 0 ? (
                <p className="text-center text-3xl font-semibold tabular-nums text-success">
                  {t("changeDue")}: {formatMoney(subMoney(cashInput, remaining))}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label={t("amount")}
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder={remaining}
              />
              {methodHasReference(method) ? (
                <Input
                  label={t("reference")}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t("referenceHint")}
                />
              ) : null}
              <PaymentProofUpload
                proofPreviews={proofPreviews}
                uploading={uploading}
                onUpload={handleProofUpload}
                onRemove={(index) => {
                  setProofPaths((p) => p.filter((_, i) => i !== index));
                  setProofPreviews((p) => p.filter((_, i) => i !== index));
                }}
              />
            </div>
          )}

          {payments.length > 0 ? (
            <ul className="space-y-2 rounded-lg border border-border p-3 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="tabular-nums font-medium">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleAddSplit}
              disabled={submitting || isZeroMoney(remaining)}
            >
              {t("addPayment")}
            </Button>
            <Button
              type="button"
              fullWidth
              size="pos"
              onClick={handleComplete}
              disabled={submitting}
            >
              {submitting ? t("completing") : t("completeSale")}
            </Button>
          </div>

          {!isZeroMoney(changeDue) && payments.length > 0 ? (
            <p className="text-center text-sm text-text-muted">
              {t("changeDue")}: {formatMoney(changeDue)}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
