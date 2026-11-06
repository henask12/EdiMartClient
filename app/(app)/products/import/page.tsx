"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type PreviewRow = {
  row: number;
  name: string;
  category: string;
  sellingPrice: string;
  costPrice?: string;
  barcode?: string;
  brand?: string;
  openingQty?: string;
  errors: string[];
  warnings: string[];
};

const ProductsImportPage = () => {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{
    rows: PreviewRow[];
    validCount: number;
    errorCount: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!csv.trim()) {
      toastError("Paste CSV or choose a file first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/imports/products/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, "Preview failed"));
        return;
      }
      setPreview(data);
    } catch {
      toastError("Network error");
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    if (!confirm(`Import ${preview.validCount} valid row(s)? Rows with errors will be skipped.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/imports/products/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, "Import failed"));
        return;
      }
      toastSuccess(`Created ${data.created}, skipped ${data.skipped}`);
      setPreview(null);
      setCsv("");
    } catch {
      toastError("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm text-primary">
        ← Products
      </Link>
      <PageHeader
        title="Bulk import"
        description="CSV columns: name, category, selling_price. Optional: cost_price, barcode, brand, opening_qty. Preview before anything is written."
      />

      <Card className="space-y-3 p-4">
        <label className="block text-sm text-text-muted">
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block w-full text-sm"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="block text-sm text-text-muted">
          Or paste CSV
          <textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(null);
            }}
            rows={8}
            className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 font-mono text-xs text-text outline-none focus:border-primary"
            placeholder={"name,category,selling_price,cost_price,barcode,opening_qty\nSoap,Bath,45,20,1234567890123,10"}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handlePreview()} disabled={busy}>
            Validate preview
          </Button>
          {preview && preview.validCount > 0 ? (
            <Button variant="secondary" onClick={() => void handleCommit()} disabled={busy}>
              Import {preview.validCount} valid rows
            </Button>
          ) : null}
        </div>
      </Card>

      {preview ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2 text-sm">
            <Badge variant="success">{preview.validCount} valid</Badge>
            <Badge variant={preview.errorCount ? "danger" : "neutral"}>
              {preview.errorCount} with errors
            </Badge>
          </div>
          <ul className="max-h-[28rem] divide-y divide-border overflow-auto">
            {preview.rows.map((r) => (
              <li key={r.row} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-muted">#{r.row}</span>
                  <span className="font-medium text-text">{r.name}</span>
                  <span className="text-text-muted">
                    {r.category} · Br {r.sellingPrice}
                    {r.openingQty ? ` · open ${r.openingQty}` : ""}
                  </span>
                  {r.errors.length === 0 ? (
                    <Badge variant="success">OK</Badge>
                  ) : (
                    <Badge variant="danger">Error</Badge>
                  )}
                </div>
                {r.errors.length > 0 ? (
                  <p className="mt-1 text-xs text-danger">{r.errors.join("; ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
};

export default ProductsImportPage;
