"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  createPurchaseOrder,
  listProducts,
  listPurchaseOrders,
  listSuppliers,
  poStatusVariant,
  type ProductOption,
  type PurchaseOrder,
  type Supplier,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";

const STATUSES = [
  "ALL",
  "DRAFT",
  "APPROVED",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED",
  "CANCELLED",
] as const;

type DraftLine = { productId: string; quantity: string; unitCost: string };

export default function PurchaseOrdersPage() {
  const t = useTranslations("Purchasing");
  const router = useRouter();
  const { canSeeCost } = usePermission();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { productId: "", quantity: "1", unitCost: "0" },
  ]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listPurchaseOrders(status));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = async () => {
    setSheetOpen(true);
    try {
      const [s, p] = await Promise.all([listSuppliers(), listProducts()]);
      setSuppliers(s);
      setProducts(p);
      setSupplierId(s[0]?.id ?? "");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load form data");
    }
  };

  const handleCreate = async () => {
    const valid = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (!supplierId || valid.length === 0) {
      toastError("Pick a supplier and at least one line");
      return;
    }
    setCreating(true);
    try {
      const po = await createPurchaseOrder({
        supplierId,
        notes: notes.trim() || undefined,
        lines: valid.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: canSeeCost ? l.unitCost || "0" : "0",
        })),
      });
      toastSuccess("Draft PO created");
      setSheetOpen(false);
      router.push(`/purchase-orders/${po.id}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create PO");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("purchaseOrders")}
        description={t("purchaseOrdersDescription")}
        actions={
          <Button type="button" onClick={() => void openCreate()}>
            {t("newPo")}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={status === s ? "primary" : "secondary"}
            onClick={() => {
              setLoading(true);
              setStatus(s);
            }}
          >
            {s === "ALL" ? "All" : s.replaceAll("_", " ")}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}

      {!loading && items.length === 0 ? <EmptyState title={t("noPos")} /> : null}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {items.map((po) => (
            <li key={po.id}>
              <Link
                href={`/purchase-orders/${po.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-muted focus-ring"
              >
                <div>
                  <p className="font-medium text-text">{po.poNumber}</p>
                  <p className="text-sm text-text-muted">
                    {po.supplier?.name ?? po.supplierId} · {formatDate(po.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {canSeeCost && po.subtotal != null ? (
                    <span className="tabular-nums text-sm text-text">
                      {formatMoney(po.subtotal)}
                    </span>
                  ) : null}
                  <Badge variant={poStatusVariant(po.status)}>
                    {po.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("newPo")}</SheetTitle>
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
            <Input
              label={t("notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="space-y-3">
              <p className="text-sm font-medium text-text">{t("lines")}</p>
              {lines.map((line, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
                  <Select
                    label={t("product")}
                    value={line.productId}
                    onChange={(e) => {
                      const productId = e.target.value;
                      const p = products.find((x) => x.id === productId);
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx
                            ? {
                                ...l,
                                productId,
                                unitCost: p?.costPrice ?? l.unitCost,
                              }
                            : l,
                        ),
                      );
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
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)),
                      )
                    }
                  />
                  {canSeeCost ? (
                    <Input
                      label={t("unitCost")}
                      value={line.unitCost}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, unitCost: e.target.value } : l)),
                        )
                      }
                    />
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setLines((prev) => [...prev, { productId: "", quantity: "1", unitCost: "0" }])
                }
              >
                {t("addLine")}
              </Button>
            </div>
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? "Creating…" : t("createDraft")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
