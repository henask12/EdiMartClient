"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePermission } from "@/components/PermissionProvider";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type CountLine = {
  id: string;
  productId: string;
  systemQtySnapshot: string;
  countedQty: string | null;
  varianceQty: string | null;
  needsRecount: boolean;
  product: { id: string; name: string; sku: string | null };
};

type CountDetail = {
  id: string;
  countNumber: string;
  status: string;
  type: string;
  location?: { name: string } | null;
  lines: CountLine[];
};

const StockCountDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const [count, setCount] = useState<CountDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/stock-counts/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load count");
      const data = (await res.json()) as CountDetail;
      setCount(data);
      const next: Record<string, string> = {};
      for (const line of data.lines ?? []) {
        next[line.productId] = line.countedQty ?? "";
      }
      setDrafts(next);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveLine = async (productId: string) => {
    const countedQty = drafts[productId];
    if (countedQty === "" || countedQty == null) {
      toastError("Enter a counted quantity");
      return;
    }
    setSaving(productId);
    const body = { productId, countedQty };
    const endpoint = `/api/proxy/stock-counts/${id}/lines`;
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const { enqueueStockCount } = await import("@/lib/offline/outbox");
        await enqueueStockCount({
          endpoint,
          body,
          label: `Count line ${productId.slice(0, 8)}`,
        });
        toastSuccess("Line queued offline");
        return;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        const { enqueueStockCount } = await import("@/lib/offline/outbox");
        await enqueueStockCount({
          endpoint,
          body,
          label: `Count line ${productId.slice(0, 8)}`,
        });
        toastSuccess("Line queued offline");
        return;
      }
      if (!res.ok) {
        toastError(parseApiMessage(data, "Could not save line"));
        return;
      }
      toastSuccess("Line saved");
      await load();
    } catch {
      const { enqueueStockCount } = await import("@/lib/offline/outbox");
      await enqueueStockCount({
        endpoint,
        body,
        label: `Count line ${productId.slice(0, 8)}`,
      });
      toastSuccess("Line queued offline");
    } finally {
      setSaving(null);
    }
  };

  const handlePost = async () => {
    if (!confirm("Post this count? Variances will adjust stock.")) return;
    try {
      const res = await fetch(`/api/proxy/stock-counts/${id}/post`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, "Could not post count"));
        return;
      }
      toastSuccess("Count posted");
      await load();
    } catch {
      toastError("Network error");
    }
  };

  if (loading) return <p className="text-sm text-text-muted">Loading…</p>;
  if (!count) return <p className="text-sm text-danger">Count not found</p>;

  const canEnter = count.status === "IN_PROGRESS" || count.status === "REVIEW";

  return (
    <div className="space-y-6">
      <Link href="/stock-counts" className="text-sm text-primary">
        ← Stock counts
      </Link>
      <PageHeader
        title={count.countNumber}
        description={`${count.type} · ${count.location?.name ?? "All locations"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{count.status}</Badge>
            {can("STOCK_COUNT_APPROVE") && canEnter ? (
              <Button onClick={() => void handlePost()}>Post count</Button>
            ) : null}
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
          Count lines {canEnter ? "(system qty hidden for blind counting)" : ""}
        </div>
        {(count.lines ?? []).length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No lines yet — start the count first.</p>
        ) : (
          <ul className="divide-y divide-border">
            {count.lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text">{line.product.name}</p>
                  <p className="text-xs text-text-muted">
                    {line.product.sku ?? "No SKU"}
                    {!canEnter || count.status === "POSTED"
                      ? ` · system ${line.systemQtySnapshot}`
                      : " · blind"}
                    {line.varianceQty != null ? ` · variance ${line.varianceQty}` : ""}
                  </p>
                </div>
                {canEnter ? (
                  <div className="flex items-end gap-2">
                    <Input
                      label="Counted"
                      value={drafts[line.productId] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [line.productId]: e.target.value }))
                      }
                      className="w-28"
                    />
                    <Button
                      size="sm"
                      disabled={saving === line.productId}
                      onClick={() => void handleSaveLine(line.productId)}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="tabular-nums text-text">{line.countedQty ?? "—"}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default StockCountDetailPage;
