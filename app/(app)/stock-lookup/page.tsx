"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format-money";
import { usePermission } from "@/components/PermissionProvider";
import { fetchIncoming } from "@/lib/purchasing";
import { toastError } from "@/lib/toast";

type LookupResult = {
  product: {
    id: string;
    name: string;
    sku: string | null;
    sellingPrice: string;
    costPrice?: string;
    trackBatches: boolean;
  };
  onHand: string;
  reserved: string;
  available: string;
  incoming?: string;
  byLocation: Array<{
    locationId: string;
    code: string;
    name: string;
    sellable: boolean;
    quantityOnHand: string;
  }>;
  batches: Array<{
    id: string;
    lotNumber: string | null;
    qtyRemaining: string;
    expiryDate: string | null;
    locationCode: string | null;
  }>;
};

const StockLookupPage = () => {
  const { canSeeCost } = usePermission();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/proxy/inventory/lookup?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        toastError("No product matched that search");
        return;
      }
      if (!res.ok) throw new Error("Lookup failed");
      const data = (await res.json()) as LookupResult;
      if (data.incoming == null && data.product?.id) {
        try {
          data.incoming = await fetchIncoming(data.product.id);
        } catch {
          data.incoming = "0";
        }
      }
      setResult(data);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock lookup"
        description="Scan or search a product — see stock by location, batches, and reserved qty."
      />
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Barcode, SKU, or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
            autoFocus
          />
        </div>
        <Button onClick={() => void handleSearch()} disabled={loading || !q.trim()}>
          {loading ? "Searching…" : "Look up"}
        </Button>
      </Card>

      {result ? (
        <div className="space-y-4">
          <Card className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-text">{result.product.name}</h2>
              {result.product.sku ? <Badge variant="neutral">{result.product.sku}</Badge> : null}
              {result.product.trackBatches ? <Badge variant="info">Batch tracked</Badge> : null}
            </div>
            <p className="text-sm text-text-muted">
              Sell {formatMoney(result.product.sellingPrice)}
              {canSeeCost && result.product.costPrice != null
                ? ` · Cost ${formatMoney(result.product.costPrice)}`
                : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-text-muted">On hand</p>
                <p className="text-lg font-semibold tabular-nums text-text">{result.onHand}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Reserved</p>
                <p className="text-lg font-semibold tabular-nums text-text">{result.reserved}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Available</p>
                <p className="text-lg font-semibold tabular-nums text-accent">{result.available}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Incoming</p>
                <p className="text-lg font-semibold tabular-nums text-text">
                  {result.incoming ?? "0"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
              By location
            </div>
            <ul className="divide-y divide-border">
              {result.byLocation.map((loc) => (
                <li key={loc.locationId} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text">
                    {loc.name}{" "}
                    <span className="text-text-muted">({loc.code})</span>
                    {!loc.sellable ? (
                      <Badge variant="warning" className="ml-2">
                        Not sellable
                      </Badge>
                    ) : null}
                  </span>
                  <span className="tabular-nums text-text">{loc.quantityOnHand}</span>
                </li>
              ))}
            </ul>
          </Card>

          {result.batches.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
                Batches
              </div>
              <ul className="divide-y divide-border">
                {result.batches.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="text-text">
                      {b.lotNumber ?? "No lot"} · {b.locationCode ?? "—"}
                    </span>
                    <span className="text-text-muted">
                      {b.qtyRemaining} left · exp {b.expiryDate?.slice(0, 10) ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default StockLookupPage;
