"use client";

import { useState } from "react";
import { downloadExport } from "@/lib/export-download";

type Props = {
  basePath: string;
  queryParams?: Record<string, string | undefined>;
};

export const ExportMenu = ({ basePath, queryParams = {} }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ format });
      for (const [key, value] of Object.entries(queryParams)) {
        if (value) {
          params.set(key, value);
        }
      }
      await downloadExport(`/api/proxy/${basePath}?${params}`);
    } catch {
      setError("Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Export</span>
      {(["csv", "xlsx", "pdf"] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          disabled={busy}
          onClick={() => void handleExport(fmt)}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase text-white/80 disabled:opacity-50"
        >
          {fmt}
        </button>
      ))}
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </div>
  );
};
