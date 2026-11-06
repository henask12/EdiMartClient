"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ManagerApprovalDialog } from "@/components/ManagerApprovalDialog";
import { usePermission } from "@/components/PermissionProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { formatDate } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import { PAYMENT_METHODS, paymentLabel, type PaymentMethod } from "@/lib/payment-methods";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type SaleLine = {
  id: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  product: { id?: string; name: string };
};

type SaleDetail = {
  id: string;
  saleNumber: string;
  createdAt: string;
  notes?: string | null;
  status?: string;
  lines: SaleLine[];
  payments?: { method: string; amount?: string; reference?: string | null }[];
  attachments?: { id: string; imageUrl: string }[];
  createdBy: { displayName: string | null; email: string };
  grandTotal?: string;
  total?: string;
};

type Props = {
  saleId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

const isSameBusinessDay = (iso: string) => {
  try {
    const created = new Date(iso);
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(created) === fmt.format(new Date());
  } catch {
    return false;
  }
};

export const SaleDetailSheet = ({ saleId, open, onClose, onChanged }: Props) => {
  const t = useTranslations("Sales");
  const { can, isOwner } = usePermission();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [returnMode, setReturnMode] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [condition, setCondition] = useState<"RESTOCK" | "DAMAGED" | "NEEDS_INSPECTION">(
    "RESTOCK",
  );
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"SALE_VOID" | "REFUND_OUTSIDE_WINDOW">(
    "SALE_VOID",
  );
  const [pendingAction, setPendingAction] = useState<"void" | "return" | null>(null);

  useEffect(() => {
    if (!open || !saleId) {
      setSale(null);
      setReturnMode(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/proxy/sales/${saleId}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toastError(parseApiMessage(data, t("loadFailed")));
          return;
        }
        if (!cancelled) {
          setSale(data as SaleDetail);
          const qty: Record<string, string> = {};
          for (const line of (data as SaleDetail).lines ?? []) {
            qty[line.id] = "0";
          }
          setReturnQty(qty);
        }
      } catch {
        toastError(t("loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, saleId, t]);

  const total = useMemo(() => {
    if (!sale) return "0";
    if (sale.grandTotal) return sale.grandTotal;
    if (sale.total) return sale.total;
    return sale.lines.reduce((s, l) => s + Number(l.lineTotal), 0).toFixed(2);
  }, [sale]);

  const runVoid = async (token?: string) => {
    if (!sale) return;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-approval-token"] = token;
    const res = await fetch(`/api/proxy/sales/${sale.id}/void`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: voidReason.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, t("voidFailed")));
      return;
    }
    toastSuccess(t("voided"));
    onChanged();
    onClose();
  };

  const runReturn = async (token?: string) => {
    if (!sale) return;
    const lines = sale.lines
      .map((l) => ({
        saleLineId: l.id,
        quantity: returnQty[l.id] || "0",
      }))
      .filter((l) => Number(l.quantity) > 0);
    if (!lines.length) {
      toastError(t("returnQty"));
      return;
    }
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-approval-token"] = token;
    const res = await fetch(`/api/proxy/sales/${sale.id}/return`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        lines,
        condition,
        refundMethod,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (String((data as { code?: string }).code ?? "").includes("WINDOW") || res.status === 403) {
        setPendingAction("return");
        setApprovalAction("REFUND_OUTSIDE_WINDOW");
        setApprovalOpen(true);
        return;
      }
      toastError(parseApiMessage(data, t("returnFailed")));
      return;
    }
    toastSuccess(t("returned"));
    onChanged();
    onClose();
  };

  const handleVoid = async () => {
    if (!sale) return;
    if (!can("SALES_VOID") && !isOwner) {
      toastError(t("voidFailed"));
      return;
    }
    if (!isSameBusinessDay(sale.createdAt)) {
      toastError(t("sameDayOnly"));
      return;
    }
    if (!window.confirm(t("voidConfirm"))) return;
    setPendingAction("void");
    setApprovalAction("SALE_VOID");
    // Try without token first; open PIN if API demands it.
    const res = await fetch(`/api/proxy/sales/${sale.id}/void`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: voidReason.trim() || undefined }),
    });
    if (res.ok) {
      toastSuccess(t("voided"));
      onChanged();
      onClose();
      return;
    }
    if (res.status === 403 || res.status === 404) {
      setApprovalOpen(true);
      return;
    }
    const data = await res.json().catch(() => ({}));
    toastError(parseApiMessage(data, t("voidFailed")));
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("saleDetail")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-6 pt-4">
            {loading || !sale ? (
              <p className="text-sm text-text-muted">{loading ? "…" : t("loadFailed")}</p>
            ) : (
              <>
                <div>
                  <p className="text-lg font-semibold text-text">{sale.saleNumber}</p>
                  <p className="text-sm text-text-muted">
                    {formatDate(sale.createdAt)} ·{" "}
                    {sale.createdBy.displayName ?? sale.createdBy.email}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                    {formatMoney(total)}
                  </p>
                </div>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {t("timeline")}
                  </h3>
                  <ul className="space-y-1 text-sm text-text">
                    <li>
                      {t("created")} — {formatDate(sale.createdAt)}
                    </li>
                    {(sale.payments ?? []).map((p, i) => (
                      <li key={i}>
                        {t("payments")}: {paymentLabel(p.method)}
                        {p.amount ? ` ${formatMoney(p.amount)}` : ""}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </li>
                    ))}
                    {sale.notes ? (
                      <li>
                        {t("notes")}: {sale.notes}
                      </li>
                    ) : null}
                  </ul>
                </section>

                <ul className="divide-y divide-border rounded-xl border border-border">
                  {sale.lines.map((line) => (
                    <li key={line.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{line.product.name}</p>
                        <p className="text-xs text-text-muted">
                          {line.quantity} × {formatMoney(line.unitPrice)}
                        </p>
                      </div>
                      <span className="tabular-nums font-medium">{formatMoney(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    {t("reprint")}
                  </Button>
                  {(can("SALES_VOID") || isOwner) && (
                    <Button type="button" variant="danger" size="sm" onClick={() => void handleVoid()}>
                      {t("voidSale")}
                    </Button>
                  )}
                  {(can("SALES_REFUND") || isOwner) && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setReturnMode((v) => !v)}
                    >
                      {t("returnItems")}
                    </Button>
                  )}
                </div>

                {(can("SALES_VOID") || isOwner) && (
                  <Input
                    label={t("voidReason")}
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                  />
                )}

                {returnMode ? (
                  <div className="space-y-3 rounded-xl border border-border p-3">
                    {sale.lines.map((line) => (
                      <Input
                        key={line.id}
                        label={`${line.product.name} (${t("returnQty")})`}
                        value={returnQty[line.id] ?? "0"}
                        onChange={(e) =>
                          setReturnQty((q) => ({ ...q, [line.id]: e.target.value }))
                        }
                        inputMode="decimal"
                      />
                    ))}
                    <Select
                      label={t("returnCondition")}
                      value={condition}
                      onChange={(e) =>
                        setCondition(e.target.value as typeof condition)
                      }
                    >
                      <option value="RESTOCK">{t("restock")}</option>
                      <option value="DAMAGED">{t("damaged")}</option>
                      <option value="NEEDS_INSPECTION">{t("needsInspection")}</option>
                    </Select>
                    <Select
                      label={t("refundMethod")}
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      fullWidth
                      onClick={() => void runReturn()}
                    >
                      {t("submitReturn")}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ManagerApprovalDialog
        open={approvalOpen}
        action={approvalAction}
        onCancel={() => {
          setApprovalOpen(false);
          setPendingAction(null);
        }}
        onApproved={(token) => {
          setApprovalOpen(false);
          if (pendingAction === "void") void runVoid(token);
          if (pendingAction === "return") void runReturn(token);
          setPendingAction(null);
        }}
      />
    </>
  );
};
