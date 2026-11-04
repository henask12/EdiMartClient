"use client";

import { formatDate } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import type { ShiftReport } from "@/lib/shifts";

type Props = {
  report: ShiftReport | null;
  title: string;
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3">
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

export const ShiftReportPrint = ({ report, title }: Props) => {
  if (!report) return null;

  const methods = report.salesByMethod ?? [];

  return (
    <div className="shift-report hidden print:block" aria-hidden>
      <div className="shift-report-header">
        <h1>{title}</h1>
        {report.shiftNumber ? <p>{report.shiftNumber}</p> : null}
        {report.registerCode ? <p>{report.registerCode}</p> : null}
        {report.cashierName ? <p>{report.cashierName}</p> : null}
        {report.openedAt ? <p>{formatDate(report.openedAt)}</p> : null}
        {report.closedAt ? <p>{formatDate(report.closedAt)}</p> : null}
      </div>

      <div className="shift-report-body">
        {report.openingFloat != null ? (
          <Row label="Opening float" value={formatMoney(report.openingFloat)} />
        ) : null}
        {report.cashSales != null ? (
          <Row label="Cash sales" value={formatMoney(report.cashSales)} />
        ) : null}
        {report.otherSales != null ? (
          <Row label="Other sales" value={formatMoney(report.otherSales)} />
        ) : null}
        {report.refunds != null ? (
          <Row label="Refunds" value={formatMoney(report.refunds)} />
        ) : null}
        {report.voids != null ? (
          <Row label="Voids" value={formatMoney(report.voids)} />
        ) : null}
        {report.discounts != null ? (
          <Row label="Discounts" value={formatMoney(report.discounts)} />
        ) : null}
        {report.cashIn != null ? (
          <Row label="Cash in" value={formatMoney(report.cashIn)} />
        ) : null}
        {report.cashOut != null ? (
          <Row label="Cash out" value={formatMoney(report.cashOut)} />
        ) : null}
        {report.vatTotal != null ? (
          <Row label="VAT" value={formatMoney(report.vatTotal)} />
        ) : null}
      </div>

      {methods.length > 0 ? (
        <div className="shift-report-methods">
          <p className="shift-report-section">By method</p>
          {methods.map((m) => (
            <Row
              key={m.method}
              label={`${m.method}${m.count != null ? ` (${m.count})` : ""}`}
              value={formatMoney(m.amount)}
            />
          ))}
        </div>
      ) : null}

      <div className="shift-report-totals">
        {report.expectedCash != null ? (
          <Row label="Expected" value={formatMoney(report.expectedCash)} />
        ) : null}
        {report.countedCash != null ? (
          <Row label="Counted" value={formatMoney(report.countedCash)} />
        ) : null}
        {report.variance != null ? (
          <Row label="Variance" value={formatMoney(report.variance)} />
        ) : null}
      </div>
    </div>
  );
};
