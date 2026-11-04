"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePermission } from "@/components/PermissionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import {
  getPurchaseOrder,
  parsePoApproveThreshold,
  poAction,
  poStatusVariant,
  purchasingFetch,
  type PurchaseOrder,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";
import "../po-print.css";

export default function PurchaseOrderDetailPage() {
  const t = useTranslations("Purchasing");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can, canSeeCost } = usePermission();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(10000);

  const load = useCallback(async () => {
    try {
      setPo(await getPurchaseOrder(params.id));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load PO");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void purchasingFetch("/settings/store")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        setThreshold(Number(parsePoApproveThreshold(data)) || 10000);
      })
      .catch(() => undefined);
  }, []);

  const runAction = async (action: "approve" | "send" | "cancel" | "close") => {
    if (!po) return;
    if (action === "approve") {
      const sub = Number(po.subtotal ?? 0);
      if (sub > threshold && !can("PURCHASE_APPROVE")) {
        toastError(
          `This PO is over Br ${threshold.toLocaleString()} and needs PURCHASE_APPROVE`,
        );
        return;
      }
    }
    setBusy(action);
    try {
      const next = await poAction(po.id, action);
      setPo(next);
      toastSuccess(`PO ${action} ok`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : `Could not ${action}`);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (!po) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger">Purchase order not found.</p>
        <Link href="/purchase-orders">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }

  const canReceive =
    po.status === "SENT" ||
    po.status === "PARTIALLY_RECEIVED" ||
    po.status === "APPROVED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber}
        description={`${po.supplier?.name ?? po.supplierId} · ${formatDate(po.createdAt)}`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => router.push("/purchase-orders")}>
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              {t("print")}
            </Button>
            {po.status === "DRAFT" ? (
              <Button
                type="button"
                onClick={() => void runAction("approve")}
                disabled={busy === "approve"}
              >
                {t("approve")}
              </Button>
            ) : null}
            {po.status === "APPROVED" ? (
              <Button
                type="button"
                onClick={() => void runAction("send")}
                disabled={busy === "send"}
              >
                {t("send")}
              </Button>
            ) : null}
            {canReceive ? (
              <Link href={`/goods-receipts/new?poId=${po.id}`}>
                <Button type="button">{t("receive")}</Button>
              </Link>
            ) : null}
            {po.status === "RECEIVED" || po.status === "PARTIALLY_RECEIVED" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runAction("close")}
                disabled={busy === "close"}
              >
                {t("closePo")}
              </Button>
            ) : null}
            {po.status !== "CLOSED" && po.status !== "CANCELLED" ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void runAction("cancel")}
                disabled={busy === "cancel"}
              >
                {t("cancel")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-2">
        <Badge variant={poStatusVariant(po.status)}>{po.status.replaceAll("_", " ")}</Badge>
        {canSeeCost && po.subtotal != null ? (
          <span className="text-sm text-text">
            {t("subtotal")}: {formatMoney(po.subtotal)}
          </span>
        ) : null}
        {po.status === "DRAFT" && Number(po.subtotal ?? 0) > threshold ? (
          <Badge variant="warning">Needs purchase approve (&gt; Br {threshold.toLocaleString()})</Badge>
        ) : null}
      </div>

      {po.notes ? (
        <Card className="no-print p-4 text-sm text-text-muted">{po.notes}</Card>
      ) : null}

      <Card className="no-print overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
          {t("lines")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t("product")}</th>
                <th className="px-4 py-2 font-medium tabular-nums">{t("expected")}</th>
                <th className="px-4 py-2 font-medium tabular-nums">{t("received")}</th>
                {canSeeCost ? (
                  <th className="px-4 py-2 font-medium tabular-nums">{t("unitCost")}</th>
                ) : null}
                {canSeeCost ? (
                  <th className="px-4 py-2 font-medium tabular-nums">{t("subtotal")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(po.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-text">{line.product?.name ?? line.productId}</td>
                  <td className="px-4 py-3 tabular-nums text-text">{line.quantityOrdered}</td>
                  <td className="px-4 py-3 tabular-nums text-text">{line.quantityReceived}</td>
                  {canSeeCost ? (
                    <td className="px-4 py-3 tabular-nums text-text">
                      {line.unitCost != null ? formatMoney(line.unitCost) : "—"}
                    </td>
                  ) : null}
                  {canSeeCost ? (
                    <td className="px-4 py-3 tabular-nums text-text">
                      {line.lineTotal != null ? formatMoney(line.lineTotal) : "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(po.receipts ?? []).length > 0 ? (
        <Card className="no-print overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
            Goods receipts
          </div>
          <ul className="divide-y divide-border">
            {po.receipts!.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm text-text">
                {r.receiptNumber} · {formatDate(r.receivedAt)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="po-print">
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Purchase Order {po.poNumber}</h1>
        <p style={{ marginBottom: 4 }}>Supplier: {po.supplier?.name ?? po.supplierId}</p>
        <p style={{ marginBottom: 4 }}>Status: {po.status}</p>
        <p style={{ marginBottom: 16 }}>Date: {formatDate(po.createdAt)}</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>
                Product
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "right", padding: 6 }}>Qty</th>
              {canSeeCost ? (
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "right", padding: 6 }}>
                  Unit cost
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {(po.lines ?? []).map((line) => (
              <tr key={line.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>
                  {line.product?.name ?? line.productId}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 6, textAlign: "right" }}>
                  {line.quantityOrdered}
                </td>
                {canSeeCost ? (
                  <td style={{ borderBottom: "1px solid #eee", padding: 6, textAlign: "right" }}>
                    {line.unitCost != null ? formatMoney(line.unitCost) : "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {canSeeCost && po.subtotal != null ? (
          <p style={{ marginTop: 16, textAlign: "right" }}>
            Subtotal: {formatMoney(po.subtotal)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
