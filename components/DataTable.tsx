"use client";

import type { ReactNode } from "react";

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
    return <p className="py-8 text-center text-sm text-white/50">{emptyMessage}</p>;
  }

  const footerCells = footer?.cells ?? {};

  return (
    <>
      {footer && mobileCard ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm lg:hidden">
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
        <ul className="space-y-2 lg:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)}>{mobileCard(row)}</li>
          ))}
        </ul>
      ) : null}

      <div
        className={`overflow-x-auto rounded-xl border border-white/10 ${mobileCard ? "hidden lg:block" : ""}`}
      >
        <table className="w-full min-w-[640px] text-left text-sm text-white/80">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/40 text-xs uppercase tracking-wide text-white/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-3 py-2.5 font-semibold ${col.className ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-white/5 transition hover:bg-white/[0.03]"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 align-middle ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer ? (
            <tfoot className="border-t border-white/15 bg-black/30 text-sm font-semibold text-white">
              <tr>
                {columns.map((col, idx) => (
                  <td key={col.key} className={`px-3 py-2.5 ${col.className ?? ""}`}>
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
