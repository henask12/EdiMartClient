"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { toastError, toastSuccess } from "@/lib/toast";

type Location = { id: string; code: string; name: string };
type Count = {
  id: string;
  countNumber: string;
  status: string;
  type: string;
  location?: { name: string } | null;
  createdAt: string;
};

const StockCountsPage = () => {
  const [counts, setCounts] = useState<Count[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        fetch("/api/proxy/stock-counts", { cache: "no-store" }),
        fetch("/api/proxy/locations", { cache: "no-store" }),
      ]);
      if (!cRes.ok) throw new Error("Could not load stock counts");
      const cJson = await cRes.json();
      const lJson = lRes.ok ? await lRes.json() : [];
      setCounts(Array.isArray(cJson) ? cJson : cJson.items ?? []);
      const locs: Location[] = Array.isArray(lJson) ? lJson : lJson.items ?? [];
      setLocations(locs);
      setLocationId((prev) => prev || locs[0]?.id || "");
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
    try {
      const res = await fetch("/api/proxy/stock-counts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "FULL", locationId: locationId || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Could not start count");
      }
      toastSuccess("Count created");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not start count");
    }
  };

  const handleStart = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy/stock-counts/${id}/start`, { method: "POST" });
      if (!res.ok) throw new Error("Could not start count");
      toastSuccess("Count started — snapshot taken");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not start");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock counts"
        description="Full or cycle counts. Snapshot at start so sales during the count are reconciled when you post."
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All / primary</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => void handleCreate()}>New full count</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">Counts</div>
        {loading ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : counts.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No counts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {counts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/stock-counts/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.countNumber}
                    </Link>
                    <Badge variant="neutral">{c.status}</Badge>
                    <Badge variant="info">{c.type}</Badge>
                  </div>
                  <p className="text-sm text-text-muted">
                    {c.location?.name ?? "All locations"} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.status === "DRAFT" ? (
                    <Button size="sm" onClick={() => void handleStart(c.id)}>
                      Start
                    </Button>
                  ) : null}
                  <Link href={`/stock-counts/${c.id}`}>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default StockCountsPage;
