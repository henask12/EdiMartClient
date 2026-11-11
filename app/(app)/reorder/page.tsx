"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePermission } from "@/components/PermissionProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/format-money";
import {
  createPosFromReorder,
  fetchReorderSuggestions,
  type ReorderSuggestion,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";

type Editable = ReorderSuggestion & { qty: string; selected: boolean };

export default function ReorderPlannerPage() {
  const t = useTranslations("Purchasing");
  const router = useRouter();
  const { canSeeCost } = usePermission();
  const [rows, setRows] = useState<Editable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await fetchReorderSuggestions();
      setRows(
        items.map((r) => ({
          ...r,
          qty: r.suggestedQty,
          selected: Number(r.suggestedQty) > 0,
        })),
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, { supplierId: string; supplierName: string; rows: Editable[] }>();
    for (const row of rows) {
      const key = row.supplierId;
      const g = map.get(key) ?? {
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        rows: [],
      };
      g.rows.push(row);
      map.set(key, g);
    }
    return [...map.values()];
  }, [rows]);

  const handleCreate = async () => {
    const selected = rows.filter((r) => r.selected && Number(r.qty) > 0);
    if (selected.length === 0) {
      toastError("Select at least one line with quantity");
      return;
    }
    const bySupplier = new Map<string, Editable[]>();
    for (const row of selected) {
      const list = bySupplier.get(row.supplierId) ?? [];
      list.push(row);
      bySupplier.set(row.supplierId, list);
    }
    setCreating(true);
    try {
      const created = await createPosFromReorder(
        [...bySupplier.entries()].map(([supplierId, lines]) => ({
          supplierId,
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.qty,
            unitCost: canSeeCost ? l.unitCost : undefined,
          })),
        })),
      );
      toastSuccess(`Created ${created.length} draft PO(s)`);
      router.push("/purchase-orders");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create draft POs");
    } finally {
      setCreating(false);
    }
  };

  const supplierTotal = (groupRows: Editable[]) =>
    groupRows
      .filter((r) => r.selected)
      .reduce((sum, r) => sum + Number(r.qty) * Number(r.unitCost ?? 0), 0);

  return (
    <div className="space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-24">
      <PageHeader
        title={t("reorder")}
        description={t("reorderDescription")}
        actions={
          <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
            {creating ? "Creating…" : t("createDraftPos")}
          </Button>
        }
      />

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState title="No reorder suggestions right now." />
      ) : null}

      {groups.map((group) => (
        <Card key={group.supplierId} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-semibold text-text">{group.supplierName}</h2>
            {canSeeCost ? (
              <span className="text-sm tabular-nums text-text-muted">
                {formatMoney(String(supplierTotal(group.rows)))}
              </span>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2 font-medium">{t("product")}</th>
                  <th className="px-3 py-2 font-medium tabular-nums">{t("available")}</th>
                  <th className="px-3 py-2 font-medium tabular-nums">{t("incoming")}</th>
                  <th className="px-3 py-2 font-medium tabular-nums">{t("daysOfCover")}</th>
                  <th className="px-3 py-2 font-medium tabular-nums">{t("suggestedQty")}</th>
                  {canSeeCost ? (
                    <th className="px-3 py-2 font-medium tabular-nums">{t("unitCost")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.rows.map((row) => (
                  <tr key={`${row.supplierId}-${row.productId}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.productId === row.productId && r.supplierId === row.supplierId
                                ? { ...r, selected: e.target.checked }
                                : r,
                            ),
                          )
                        }
                        aria-label={`Select ${row.productName}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-text">
                      <p className="font-medium">{row.productName}</p>
                      {row.sku ? <p className="text-xs text-text-muted">{row.sku}</p> : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-text">{row.available}</td>
                    <td className="px-3 py-2 tabular-nums text-text">{row.incoming}</td>
                    <td className="px-3 py-2 tabular-nums text-text">
                      {row.daysOfCover ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.qty}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.productId === row.productId && r.supplierId === row.supplierId
                                ? { ...r, qty: e.target.value, selected: true }
                                : r,
                            ),
                          )
                        }
                        aria-label={`Qty for ${row.productName}`}
                      />
                    </td>
                    {canSeeCost ? (
                      <td className="px-3 py-2 tabular-nums text-text">
                        {row.unitCost != null ? formatMoney(row.unitCost) : "—"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:left-60 mb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:mb-0">
        <div className="mx-auto flex max-w-6xl justify-end">
          <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={() => void handleCreate()} disabled={creating}>
            {creating ? "Creating…" : t("createDraftPos")}
          </Button>
        </div>
      </div>
    </div>
  );
}
