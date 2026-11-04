"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePermission } from "@/components/PermissionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { formatDate } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import {
  completeSupplierReturn,
  createSupplierReturn,
  listLocations,
  listProducts,
  listSupplierReturns,
  listSuppliers,
  type LocationOption,
  type ProductOption,
  type Supplier,
  type SupplierReturn,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";

const ReturnsInner = () => {
  const t = useTranslations("Purchasing");
  const search = useSearchParams();
  const { canSeeCost } = usePermission();

  const [items, setItems] = useState<SupplierReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listSupplierReturns());
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const preProduct = search.get("productId");
    const preQty = search.get("qty");
    if (preProduct || preQty) {
      setSheetOpen(true);
      if (preProduct) setProductId(preProduct);
      if (preQty) setQuantity(preQty);
      void (async () => {
        const [s, p, l] = await Promise.all([listSuppliers(), listProducts(), listLocations()]);
        setSuppliers(s);
        setProducts(p);
        setLocations(l);
        setSupplierId(s[0]?.id ?? "");
        const quarantine =
          l.find((x) => x.code.toUpperCase().includes("QUARANTINE")) ??
          l.find((x) => !x.sellable) ??
          l[0];
        setLocationId(quarantine?.id ?? "");
        const prod = p.find((x) => x.id === preProduct);
        if (prod?.costPrice) setUnitCost(prod.costPrice);
      })();
    }
  }, [search]);

  const openCreate = async () => {
    setSheetOpen(true);
    try {
      const [s, p, l] = await Promise.all([listSuppliers(), listProducts(), listLocations()]);
      setSuppliers(s);
      setProducts(p);
      setLocations(l);
      setSupplierId((prev) => prev || s[0]?.id || "");
      const quarantine =
        l.find((x) => x.code.toUpperCase().includes("QUARANTINE")) ??
        l.find((x) => !x.sellable) ??
        l[0];
      setLocationId((prev) => prev || quarantine?.id || "");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load form");
    }
  };

  const handleCreate = async () => {
    if (!supplierId || !productId || !locationId || Number(quantity) <= 0) {
      toastError("Supplier, product, location and qty are required");
      return;
    }
    setCreating(true);
    try {
      await createSupplierReturn({
        supplierId,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: [
          {
            productId,
            quantity,
            unitCost: canSeeCost ? unitCost : undefined,
            locationId,
          },
        ],
      });
      toastSuccess("Return draft created");
      setSheetOpen(false);
      setReason("");
      setNotes("");
      setQuantity("1");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create return");
    } finally {
      setCreating(false);
    }
  };

  const handleComplete = async (id: string) => {
    setBusyId(id);
    try {
      await completeSupplierReturn(id);
      toastSuccess("Return completed");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not complete return");
    } finally {
      setBusyId(null);
    }
  };

  const statusVariant = (s: string) => {
    if (s === "COMPLETED") return "success" as const;
    if (s === "CANCELLED") return "neutral" as const;
    if (s === "SENT") return "info" as const;
    return "warning" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("returns")}
        description={t("returnsDescription")}
        actions={
          <Button type="button" onClick={() => void openCreate()}>
            {t("newReturn")}
          </Button>
        }
      />

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}
      {!loading && items.length === 0 ? <EmptyState title="No supplier returns yet." /> : null}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-text">{r.returnNumber}</p>
                <p className="text-sm text-text-muted">
                  {r.supplier?.name ?? r.supplierId} · {formatDate(r.createdAt)}
                </p>
                {(r.lines ?? []).map((line) => (
                  <p key={line.id} className="text-xs text-text-muted">
                    {line.product?.name ?? line.productId} × {line.quantity}
                    {canSeeCost && line.unitCost != null
                      ? ` · ${formatMoney(line.unitCost)}`
                      : ""}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                {r.status === "DRAFT" || r.status === "SENT" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => void handleComplete(r.id)}
                  >
                    {t("completeReturn")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("newReturn")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 p-1">
            <Select
              label={t("supplier")}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label={t("product")}
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p?.costPrice) setUnitCost(p.costPrice);
              }}
            >
              <option value="">Choose…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              label={t("quantity")}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {canSeeCost ? (
              <Input
                label={t("unitCost")}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            ) : null}
            <Select
              label={t("location")}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {!l.sellable ? " (not sellable)" : ""}
                </option>
              ))}
            </Select>
            <Input
              label={t("reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Input
              label={t("notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? "Creating…" : t("createDraft")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default function SupplierReturnsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <ReturnsInner />
    </Suspense>
  );
}
