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

const defaultMobileCard = <T,>(
  row: T,
  columns: DataTableColumn<T>[],
): ReactNode => {
  const primary = columns[0];
  const rest = columns.slice(1);
  return (
    <div className="space-y-3">
      {primary ? (
        <div className="min-w-0 text-base font-semibold text-text">
          {primary.render(row)}
        </div>
      ) : null}
      {rest.length > 0 ? (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rest.map((col) => (
            <div key={col.key} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {col.header}
              </dt>
              <dd className="mt-0.5 break-words text-sm text-text">{col.render(row)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
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
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        {emptyMessage}
      </p>
    );
  }

  const footerCells = footer?.cells ?? {};
  const renderMobile = mobileCard ?? ((row: T) => defaultMobileCard(row, columns));

  return (
    <>
      {footer ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm lg:hidden">
          <span className="font-semibold text-text-muted">{footer.label}</span>
          <div className="flex flex-wrap gap-3 text-text">
            {columns
              .filter((col) => footerCells[col.key] != null)
              .map((col) => (
                <span key={col.key} className="tabular-nums">
                  <span className="text-text-muted">{col.header}: </span>
                  {footerCells[col.key]}
                </span>
              ))}
          </div>
        </div>
      ) : null}

      <ul className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            {renderMobile(row)}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border shadow-sm lg:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border/50 transition-colors hover:bg-surface-muted/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 align-middle text-text",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer ? (
            <tfoot className="border-t border-border bg-surface-muted">
              <tr>
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold text-text",
                      col.className,
                    )}
                  >
                    {idx === 0
                      ? footer.label
                      : (footerCells[col.key] ?? null)}
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
