"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toastError, toastSuccess } from "@/lib/toast";

type Location = {
  id: string;
  code: string;
  name: string;
  storeCode: string;
  sellable: boolean;
  sortOrder: number;
  binCode: string | null;
  isActive: boolean;
};

const LocationsSettingsPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sellable, setSellable] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/locations", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load locations");
      const json = await res.json();
      setLocations(Array.isArray(json) ? json : json.items ?? []);
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
    if (!name.trim() || !code.trim()) {
      toastError("Name and code are required");
      return;
    }
    try {
      const res = await fetch("/api/proxy/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase().replace(/\s+/g, "_"),
          sellable,
          storeCode: "DEFAULT_STORE",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Could not create location");
      }
      toastSuccess("Location created");
      setName("");
      setCode("");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Shop floor, back store, quarantine (and optional bins). Available to sell = sellable locations − reserved."
      />

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-text">Add location</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DISPLAY" />
          <label className="flex items-end gap-2 pb-2 text-sm text-text">
            <input
              type="checkbox"
              checked={sellable}
              onChange={(e) => setSellable(e.target.checked)}
              className="size-4"
            />
            Sellable
          </label>
        </div>
        <Button onClick={() => void handleCreate()}>Add</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-medium text-text">
          Store DEFAULT_STORE
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-border">
            {locations.map((loc) => (
              <li key={loc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-text">
                    {loc.name}{" "}
                    <span className="text-text-muted">({loc.code})</span>
                  </p>
                  {loc.binCode ? (
                    <p className="text-xs text-text-muted">Bin {loc.binCode}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {loc.sellable ? <Badge variant="success">Sellable</Badge> : <Badge variant="warning">Not sellable</Badge>}
                  {!loc.isActive ? <Badge variant="neutral">Inactive</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default LocationsSettingsPage;
