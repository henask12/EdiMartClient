"use client";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export const Pagination = ({ page, pageSize, total, onPageChange }: Props) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1 && total <= pageSize) {
    return (
      <p className="text-center text-xs text-white/45">
        {total === 0 ? "No results" : `Showing ${total} item${total === 1 ? "" : "s"}`}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-white/50">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          aria-label="Previous page"
        >
          Prev
        </button>
        <span className="min-w-[5rem] text-center text-sm tabular-nums text-white/70">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
};
