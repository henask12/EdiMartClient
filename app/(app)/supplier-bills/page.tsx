"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { formatDate } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import {
  createSupplierBill,
  fetchAgedPayables,
  listGoodsReceipts,
  listSupplierBills,
  listSuppliers,
  recordBillPayment,
  type AgedPayables,
  type Supplier,
  type SupplierBill,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";

const STATUSES = ["ALL", "OPEN", "PARTIAL", "PAID", "VOID"] as const;

export default function SupplierBillsPage() {
  const t = useTranslations("Purchasing");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("OPEN");
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [aged, setAged] = useState<AgedPayables | null>(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [receipts, setReceipts] = useState<
    Array<{ id: string; receiptNumber: string; purchaseOrderId?: string | null }>
  >([]);
  const [supplierId, setSupplierId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [creating, setCreating] = useState(false);

  const [payBill, setPayBill] = useState<SupplierBill | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, agedData] = await Promise.all([
        listSupplierBills(status),
        fetchAgedPayables().catch(() => null),
      ]);
      setBills(list);
      setAged(agedData);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load bills");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = async () => {
    setCreateOpen(true);
    try {
      const s = await listSuppliers();
      setSuppliers(s);
      setSupplierId(s[0]?.id ?? "");
      const gr = await listGoodsReceipts({ supplierId: s[0]?.id });
      setReceipts(gr);
      setReceiptId(gr[0]?.id ?? "");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load form");
    }
  };

  useEffect(() => {
    if (!createOpen || !supplierId) return;
    void listGoodsReceipts({ supplierId }).then((gr) => {
      setReceipts(gr);
      setReceiptId(gr[0]?.id ?? "");
    });
  }, [createOpen, supplierId]);

  const handleCreate = async () => {
    if (!supplierId || !amountDue) {
      toastError("Supplier and amount are required");
      return;
    }
    setCreating(true);
    try {
      await createSupplierBill({
        supplierId,
        amountDue,
        dueDate: dueDate || undefined,
        supplierInvoiceRef: invoiceRef || undefined,
        goodsReceiptIds: receiptId ? [receiptId] : undefined,
        purchaseOrderId: receipts.find((r) => r.id === receiptId)?.purchaseOrderId ?? undefined,
      });
      toastSuccess("Bill created");
      setCreateOpen(false);
      setAmountDue("");
      setDueDate("");
      setInvoiceRef("");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create bill");
    } finally {
      setCreating(false);
    }
  };

  const handlePay = async () => {
    if (!payBill || !payAmount) return;
    setPaying(true);
    try {
      await recordBillPayment(payBill.id, {
        amount: payAmount,
        method: payMethod,
        reference: payRef || undefined,
      });
      toastSuccess("Payment recorded");
      setPayBill(null);
      setPayAmount("");
      setPayRef("");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not record payment");
    } finally {
      setPaying(false);
    }
  };

  const remaining = (b: SupplierBill) =>
    Math.max(0, Number(b.amountDue) - Number(b.amountPaid));

  const statusVariant = (s: string) => {
    if (s === "PAID") return "success" as const;
    if (s === "PARTIAL") return "warning" as const;
    if (s === "VOID") return "neutral" as const;
    return "info" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bills")}
        description={t("billsDescription")}
        actions={
          <Button type="button" onClick={() => void openCreate()}>
            {t("newBill")}
          </Button>
        }
      />

      {aged ? (
        <Card className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <p className="sm:col-span-3 lg:col-span-6 text-sm font-semibold text-text">
            {t("agedPayables")}
          </p>
          {[
            ["Current", aged.current],
            ["1–30", aged.days1to30],
            ["31–60", aged.days31to60],
            ["61–90", aged.days61to90],
            ["90+", aged.over90],
            ["Total", aged.total],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="tabular-nums font-medium text-text">
                {formatMoney(String(value ?? "0"))}
              </p>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={status === s ? "primary" : "secondary"}
            onClick={() => {
              setLoading(true);
              setStatus(s);
            }}
          >
            {s === "ALL" ? "All" : s}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}
      {!loading && bills.length === 0 ? <EmptyState title="No bills yet." /> : null}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {bills.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-text">{b.billNumber}</p>
                <p className="text-sm text-text-muted">
                  {b.supplier?.name ?? b.supplierId}
                  {b.dueDate ? ` · due ${formatDate(b.dueDate)}` : ""}
                </p>
                {b.supplierInvoiceRef ? (
                  <p className="text-xs text-text-muted">Inv {b.supplierInvoiceRef}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right text-sm">
                  <p className="tabular-nums text-text">{formatMoney(b.amountDue)}</p>
                  <p className="tabular-nums text-text-muted">
                    paid {formatMoney(b.amountPaid)} · left {formatMoney(String(remaining(b)))}
                  </p>
                </div>
                <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                {b.status === "OPEN" || b.status === "PARTIAL" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setPayBill(b);
                      setPayAmount(String(remaining(b)));
                    }}
                  >
                    {t("recordPayment")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("newBill")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 p-1">
            <Select
              label={t("supplier")}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="Goods receipt"
              value={receiptId}
              onChange={(e) => setReceiptId(e.target.value)}
            >
              <option value="">None</option>
              {receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.receiptNumber}
                </option>
              ))}
            </Select>
            <Input
              label={t("amountDue")}
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
            />
            <Input
              label={t("dueDate")}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <Input
              label={t("invoiceRef")}
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
            />
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? "Creating…" : t("createDraft")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!payBill} onOpenChange={(o) => !o && setPayBill(null)}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {t("recordPayment")}
              {payBill ? ` · ${payBill.billNumber}` : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 p-1">
            <Input
              label={t("paymentAmount")}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <Select
              label={t("paymentMethod")}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="TELEBIRR">Telebirr</option>
              <option value="CBE_BIRR">CBE Birr</option>
              <option value="CARD">Card</option>
            </Select>
            <Input
              label="Reference"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
            <Button type="button" onClick={() => void handlePay()} disabled={paying}>
              {paying ? "Saving…" : t("recordPayment")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
