"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format-money";
import type { CheckoutResult, PosCartLine, PosSettings } from "@/lib/pos-types";
import { toastError, toastSuccess } from "@/lib/toast";
import { paymentLabel } from "@/lib/payment-methods";
import { computeCartTotals } from "@/lib/pos-money";

type Props = {
  result: CheckoutResult;
  changeDue: string;
  lines: PosCartLine[];
  cartDiscount: string;
  settings: PosSettings;
  cashierName: string;
  onNewSale: () => void;
};

export const PosSuccessPanel = ({
  result,
  changeDue,
  lines,
  cartDiscount,
  settings,
  cashierName,
  onNewSale,
}: Props) => {
  const t = useTranslations("Pos");
  const totals = computeCartTotals(
    lines,
    cartDiscount,
    settings.vatRate,
    settings.vatInclusive,
  );
  const total = result.grandTotal ?? result.total ?? totals.total;
  const saleNumber = result.saleNumber ?? result.id;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = [
      t("receiptShareTitle", { number: saleNumber }),
      ...lines.map(
        (l) =>
          `${l.qty} × ${l.name} — ${formatMoney(
            (Number(l.unitPrice) * l.qty - Number(l.lineDiscount)).toFixed(2),
          )}`,
      ),
      `${t("total")}: ${formatMoney(total)}`,
      result.receiptUrl ? result.receiptUrl : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: saleNumber, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toastSuccess(t("receiptCopied"));
    } catch {
      toastError(t("shareFailed"));
    }
  };

  return (
    <>
      <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center print:hidden">
        <div className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-10" strokeWidth={3} aria-hidden />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-text">
            {result.pendingSync ? t("saleQueued") : t("saleComplete")}
          </h2>
          <p className="mt-1 text-sm text-text-muted">{saleNumber}</p>
          {result.pendingSync ? (
            <p className="mt-2 text-xs text-warning">{t("pendingSyncHint")}</p>
          ) : null}
        </div>
        {Number(changeDue) > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">{t("changeDue")}</p>
            <p className="text-5xl font-semibold tabular-nums text-success">
              {formatMoney(changeDue)}
            </p>
          </div>
        ) : (
          <p className="text-3xl font-semibold tabular-nums text-text">{formatMoney(total)}</p>
        )}
        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" fullWidth onClick={handlePrint}>
            {t("print")}
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={handlePrint}>
            {t("savePdf")}
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={() => void handleShare()}>
            {t("share")}
          </Button>
        </div>
        <Button type="button" size="pos" fullWidth className="max-w-md" onClick={onNewSale}>
          {t("newSale")}
        </Button>
      </div>

      {/* Thermal receipt — visible only when printing */}
      <div className="pos-receipt hidden print:block" aria-hidden>
        <header className="pos-receipt-header">
          <h1>Edi&apos;s Collection</h1>
          {settings.tin ? <p>TIN: {settings.tin}</p> : null}
          <p>{saleNumber}</p>
          <p>{result.createdAt ? new Date(result.createdAt).toLocaleString() : new Date().toLocaleString()}</p>
          <p>{cashierName}</p>
        </header>
        <table className="pos-receipt-lines">
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.qty} × {l.name}
                </td>
                <td className="text-right">
                  {formatMoney(
                    (Number(l.unitPrice) * l.qty - Number(l.lineDiscount)).toFixed(2),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="pos-receipt-totals">
          <div>
            <dt>{t("subtotal")}</dt>
            <dd>{formatMoney(totals.subtotal)}</dd>
          </div>
          {Number(totals.discountTotal) > 0 ? (
            <div>
              <dt>{t("discount")}</dt>
              <dd>-{formatMoney(totals.discountTotal)}</dd>
            </div>
          ) : null}
          <div>
            <dt>
              {t("vat")} ({settings.vatRate}%)
            </dt>
            <dd>{formatMoney(totals.vat)}</dd>
          </div>
          <div className="pos-receipt-grand">
            <dt>{t("total")}</dt>
            <dd>{formatMoney(total)}</dd>
          </div>
        </dl>
        {(result.payments ?? []).map((p, i) => (
          <p key={i}>
            {paymentLabel(p.method)}
            {p.amount ? ` ${formatMoney(p.amount)}` : ""}
            {p.reference ? ` · ${p.reference}` : ""}
          </p>
        ))}
        {Number(changeDue) > 0 ? (
          <p>
            {t("changeDue")}: {formatMoney(changeDue)}
          </p>
        ) : null}
        {settings.receiptFooter ? <p className="pos-receipt-footer">{settings.receiptFooter}</p> : null}
        {result.receiptUrl ? <p className="pos-receipt-footer">{result.receiptUrl}</p> : null}
      </div>
    </>
  );
};
