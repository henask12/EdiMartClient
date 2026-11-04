"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toastError, toastSuccess } from "@/lib/toast";

type LabelJob = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  product: { id: string; name: string; sku: string | null; sellingPrice: string };
};

const LabelsPage = () => {
  const [jobs, setJobs] = useState<LabelJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/labels/pending", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load label queue");
      const json = await res.json();
      setJobs(Array.isArray(json) ? json : json.items ?? []);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePrinted = async (id: string) => {
    try {
      const res = await fetch("/api/proxy/labels/printed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error("Could not mark printed");
      toastSuccess("Marked printed");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        description="Reprint queue after price changes or receiving. Use your browser print for A4 / thermal sheets."
        actions={
          <Button variant="secondary" onClick={handlePrintSheet} disabled={jobs.length === 0}>
            Print pending
          </Button>
        }
      />

      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text print:hidden">
          Pending reprints
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : jobs.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Queue empty" description="Price changes and receives will add labels here." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 print:break-inside-avoid"
              >
                <div>
                  <p className="font-medium text-text">{j.product.name}</p>
                  <p className="text-sm text-text-muted">
                    {j.product.sku ?? "No SKU"} · {j.reason} · Br {j.product.sellingPrice}
                  </p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <Badge variant="warning">{j.status}</Badge>
                  <Button size="sm" onClick={() => void handlePrinted(j.id)}>
                    Mark printed
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default LabelsPage;
