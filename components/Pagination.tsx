"use client";

import { IconButton } from "@/components/ui/IconButton";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
import { cn } from "@/lib/cn";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

const getPageItems = (page: number, totalPages: number): (number | "ellipsis")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
};

export const Pagination = ({ page, pageSize, total, onPageChange }: Props) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageItems = getPageItems(page, totalPages);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-white/50">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
          <IconButton
            variant="secondary"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            icon={<ChevronLeft />}
          />
          {pageItems.map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-1 text-xs text-white/40">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] border px-2 text-xs font-semibold tabular-nums transition focus-ring",
                  item === page
                    ? "border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)]/15 text-[var(--accent)]"
                    : "border-white/15 text-white/70 hover:bg-white/5",
                )}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            ),
          )}
          <IconButton
            variant="secondary"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            icon={<ChevronRight />}
          />
        </nav>
      ) : null}
    </div>
  );
};
