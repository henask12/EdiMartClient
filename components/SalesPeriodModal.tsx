"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format-money";
import { toastError } from "@/lib/toast";
import { periodBounds, type PeriodKey } from "@/lib/period-bounds";

type SaleLine = {
  id: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  netProfit?: string;
  product: { name: string };
};

type Sale = {
  id: string;
  saleNumber: string;
  grandTotal: string;
  createdAt: string;
  lines: SaleLine[];
  createdBy: { displayName: string | null; email: string };
};

type Props = {
  period: PeriodKey;
  summaryTotal: string;
  summaryNetProfit?: string;
  summaryCount: number;
  onClose: () => void;
};

export const SalesPeriodModal = ({
  period,
  summaryTotal,
  summaryNetProfit,
  summaryCount,
  onClose,
}: Props) => {
  const [items, setItems] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const bounds = periodBounds(period);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from: bounds.from,
          to: bounds.to,
          take: "100",
          skip: "0",
        });
        const res = await fetch(`/api/proxy/sales?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load sales");
        const data = (await res.json()) as { items: Sale[] };
        setItems(data.items);
      } catch (e) {
        toastError(e instanceof Error ? e.message : "Error loading sales");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [bounds.from, bounds.to]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const salesHref = `/sales?from=${encodeURIComponent(bounds.from)}&to=${encodeURIComponent(bounds.to)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-period-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2
              id="sales-period-title"
              className="text-lg font-semibold text-text"
            >
              {bounds.label} sales
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {summaryCount} sales · {formatMoney(summaryTotal)}
              {summaryNetProfit !== undefined
                ? ` · Profit ${formatMoney(summaryNetProfit)}`
                : null}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {bounds.from} — {bounds.to}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-text-muted">Loading sales…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-text-muted">
              No sales in this period.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((sale) => (
                <li
                  key={sale.id}
                  className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-text">
                        {sale.saleNumber}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(sale.createdAt).toLocaleString()} ·{" "}
                        {sale.createdBy.displayName ?? sale.createdBy.email}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-accent">
                      {formatMoney(sale.grandTotal)}
                    </p>
                  </div>
                  <ul className="mt-2 space-y-1 border-t border-border pt-2 text-text-muted">
                    {sale.lines.map((line) => (
                      <li
                        key={line.id}
                        className="flex justify-between gap-2"
                      >
                        <span>
                          {line.product.name} × {line.quantity}
                        </span>
                        <span className="shrink-0 text-right tabular-nums text-text-muted">
                          {formatMoney(line.lineTotal)}
                          {line.netProfit !== undefined ? (
                            <span className="block text-[10px] text-accent">
                              Profit {formatMoney(line.netProfit)}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 border-t border-border p-4">
          <Link href={salesHref} className="flex-1">
            <Button type="button" variant="secondary" fullWidth>
              Open in Sales history
            </Button>
          </Link>
          <Button type="button" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
