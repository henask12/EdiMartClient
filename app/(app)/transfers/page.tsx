"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { toastError, toastSuccess } from "@/lib/toast";

type Location = { id: string; code: string; name: string; sellable: boolean };
type Transfer = {
  id: string;
  transferNumber: string;
  status: string;
  fromLocation: { name: string; code: string };
  toLocation: { name: string; code: string };
  createdAt: string;
  lines: Array<{ productId: string; quantity: string; product?: { name: string } }>;
};

const TransfersPage = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [tRes, lRes, pRes] = await Promise.all([
        fetch("/api/proxy/transfers", { cache: "no-store" }),
        fetch("/api/proxy/locations", { cache: "no-store" }),
        fetch("/api/proxy/products?take=200", { cache: "no-store" }),
      ]);
      if (!tRes.ok) throw new Error("Could not load transfers");
      if (!lRes.ok) throw new Error("Could not load locations");
      const tJson = await tRes.json();
      const lJson = await lRes.json();
      const pJson = pRes.ok ? await pRes.json() : { items: [] };
      setTransfers(Array.isArray(tJson) ? tJson : tJson.items ?? []);
      const locs: Location[] = Array.isArray(lJson) ? lJson : lJson.items ?? [];
      setLocations(locs);
      setFromId((prev) => prev || locs[0]?.id || "");
      setToId((prev) => prev || locs[1]?.id || locs[0]?.id || "");
      const items = Array.isArray(pJson) ? pJson : pJson.items ?? [];
      setProducts(items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!fromId || !toId || !productId || fromId === toId) {
      toastError("Pick different from/to locations and a product");
      return;
    }
    try {
      const res = await fetch("/api/proxy/transfers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromLocationId: fromId,
          toLocationId: toId,
          lines: [{ productId, quantity: qty }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Could not create transfer");
      }
      toastSuccess("Transfer draft created");
      setQty("1");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create transfer");
    }
  };

  const handleAction = async (id: string, action: "send" | "receive" | "cancel") => {
    try {
      const res = await fetch(`/api/proxy/transfers/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Could not ${action}`);
      }
      toastSuccess(`Transfer ${action} ok`);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : `Could not ${action}`);
    }
  };

  const statusVariant = (s: string) => {
    if (s === "RECEIVED") return "success" as const;
    if (s === "SENT") return "info" as const;
    if (s === "CANCELLED") return "neutral" as const;
    return "warning" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfers"
        description="Move stock between shop floor, back store, and quarantine."
      />

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-text">New transfer</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="From" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select label="To" value={toId} onChange={(e) => setToId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select label="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Choose…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input label="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <Button onClick={() => void handleCreate()}>Create draft</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
          Recent transfers
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : transfers.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No transfers yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{t.transferNumber}</span>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </div>
                  <p className="text-sm text-text-muted">
                    {t.fromLocation.name} → {t.toLocation.name} ·{" "}
                    {t.lines
                      .map((l) => `${l.product?.name ?? l.productId} × ${l.quantity}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.status === "DRAFT" ? (
                    <>
                      <Button size="sm" onClick={() => void handleAction(t.id, "send")}>
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleAction(t.id, "cancel")}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                  {t.status === "SENT" ? (
                    <Button size="sm" onClick={() => void handleAction(t.id, "receive")}>
                      Receive
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default TransfersPage;
