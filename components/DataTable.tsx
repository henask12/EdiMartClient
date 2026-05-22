"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export type DataTableFooter = {
  label: string;
  cells: Record<string, ReactNode>;
};

type Props<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  mobileCard?: (row: T) => ReactNode;
  footer?: DataTableFooter;
};

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  mobileCard,
  footer,
}: Props<T>) => {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-white/50">{emptyMessage}</p>;
  }

  const footerCells = footer?.cells ?? {};

  return (
    <>
      {footer && mobileCard ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-white/10 bg-black/25 px-4 py-3 text-sm lg:hidden">
          <span className="font-semibold text-white/70">{footer.label}</span>
          <div className="flex flex-wrap gap-3 text-white/80">
            {columns
              .filter((col) => footerCells[col.key] != null)
              .map((col) => (
                <span key={col.key} className="tabular-nums">
                  <span className="text-white/45">{col.header}: </span>
                  {footerCells[col.key]}
                </span>
              ))}
          </div>
        </div>
      ) : null}

      {mobileCard ? (
        <ul className="space-y-3 lg:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)} className="card-surface p-4">
              {mobileCard(row)}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={cn(
          "overflow-x-auto rounded-[var(--radius-md)] border border-white/10",
          mobileCard && "hidden lg:block",
        )}
      >
        <table className="w-full min-w-[640px] text-left text-sm text-white/80">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/50",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.04]"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 align-middle", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer ? (
            <tfoot className="border-t border-white/15 bg-black/35">
              <tr>
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold text-white",
                      col.className,
                    )}
                  >
                    {idx === 0 ? footer.label : (footerCells[col.key] ?? null)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  );
};
