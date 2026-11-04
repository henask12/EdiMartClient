"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format-money";
import { usePermission } from "@/components/PermissionProvider";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type Overview = {
  skuCount?: number;
  activeSkus?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  valueAtCost?: string | null;
  stockValueAtCost?: string | null;
  valueAtRetail?: string | null;
  stockValueAtRetail?: string | null;
  expiringValue30d?: string | null;
  quarantinedQty?: string;
  quarantineOnHand?: string;
};

type ReplenishItem = {
  productId: string;
  productName: string;
  sku: string | null;
  floorOnHand: string;
  backOnHand: string;
  suggestedQty: string;
  fromLocationId: string;
  toLocationId: string;
};

const InventoryOverviewPage = () => {
  const { can, canSeeCost } = usePermission();
  const [data, setData] = useState<Overview | null>(null);
  const [replenish, setReplenish] = useState<ReplenishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, rRes] = await Promise.all([
          fetch("/api/proxy/inventory/overview", { cache: "no-store" }),
          fetch("/api/proxy/inventory/replenishment", { cache: "no-store" }),
        ]);
        if (!oRes.ok) throw new Error("Could not load inventory overview");
        setData(await oRes.json());
        if (rRes.ok) {
          const rJson = await rRes.json();
          setReplenish(Array.isArray(rJson) ? rJson : rJson.items ?? []);
        }
      } catch (e) {
        toastError(e instanceof Error ? e.message : "Could not load inventory overview");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleCreateTransfer = async (item: ReplenishItem) => {
    setCreatingId(item.productId);
    try {
      const res = await fetch("/api/proxy/transfers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromLocationId: item.fromLocationId,
          toLocationId: item.toLocationId,
          notes: "Floor replenishment suggestion",
          lines: [{ productId: item.productId, quantity: item.suggestedQty }],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(body, "Could not create transfer"));
        return;
      }
      toastSuccess("Transfer draft created — send it from Transfers");
      setReplenish((prev) => prev.filter((p) => p.productId !== item.productId));
    } catch {
      toastError("Network error");
    } finally {
      setCreatingId(null);
    }
  };

  const skuCount = data?.skuCount ?? data?.activeSkus ?? 0;
  const valueAtCost = data?.valueAtCost ?? data?.stockValueAtCost ?? null;
  const valueAtRetail = data?.valueAtRetail ?? data?.stockValueAtRetail ?? null;
  const quarantined = data?.quarantinedQty ?? data?.quarantineOnHand ?? "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory overview"
        description="Stock value, SKUs, low/out counts, and floor replenishment."
        actions={
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/stock-lookup" className="text-primary hover:underline">
              Stock lookup
            </Link>
            <Link href="/products/import" className="text-primary hover:underline">
              Bulk import
            </Link>
            <Link href="/add-stock" className="text-primary hover:underline">
              Receive
            </Link>
            <Link href="/transfers" className="text-primary hover:underline">
              Transfers
            </Link>
            <Link href="/stock-counts" className="text-primary hover:underline">
              Counts
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="SKUs tracked" value={String(skuCount)} />
          <StatCard label="Low stock" value={String(data.lowStockCount ?? 0)} />
          <StatCard label="Out of stock" value={String(data.outOfStockCount ?? 0)} />
          <StatCard label="In quarantine" value={quarantined} />
          {canSeeCost && valueAtCost != null ? (
            <StatCard label="Value at cost" value={formatMoney(valueAtCost)} />
          ) : null}
          {valueAtRetail != null ? (
            <StatCard label="Value at retail" value={formatMoney(valueAtRetail)} />
          ) : null}
          {canSeeCost && data.expiringValue30d != null ? (
            <StatCard label="Expiring ≤30 days" value={formatMoney(data.expiringValue30d)} />
          ) : null}
        </div>
      ) : (
        <Card className="p-6 text-text-muted">No overview data yet.</Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
          Shop-floor replenishment (from back store)
        </div>
        {replenish.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">Floor stock is fine — nothing to bring forward.</p>
        ) : (
          <ul className="divide-y divide-border">
            {replenish.map((item) => (
              <li
                key={item.productId}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text">{item.productName}</p>
                  <p className="text-sm text-text-muted">
                    Floor {item.floorOnHand} · Back {item.backOnHand} · Suggest {item.suggestedQty}
                  </p>
                </div>
                {can("STOCK_TRANSFER") ? (
                  <Button
                    size="sm"
                    disabled={creatingId === item.productId}
                    onClick={() => void handleCreateTransfer(item)}
                  >
                    Create transfer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default InventoryOverviewPage;
