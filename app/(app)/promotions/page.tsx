"use client";

import { useCallback, useEffect, useState } from "react";
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
  createPromotion,
  listPromotions,
  PROMOTION_TARGETS,
  PROMOTION_TYPES,
  promotionTypeLabel,
  updatePromotion,
  type Promotion,
  type PromotionTarget,
  type PromotionType,
} from "@/lib/promotions";
import { toastError, toastSuccess } from "@/lib/toast";

type FormState = {
  name: string;
  code: string;
  type: PromotionType;
  value: string;
  minSpend: string;
  target: PromotionTarget;
  productId: string;
  categoryId: string;
  startsAt: string;
  endsAt: string;
  priority: string;
  stackable: boolean;
  isActive: boolean;
  maxUses: string;
};

const emptyForm = (): FormState => ({
  name: "",
  code: "",
  type: "PERCENT_OFF",
  value: "",
  minSpend: "",
  target: "ALL",
  productId: "",
  categoryId: "",
  startsAt: "",
  endsAt: "",
  priority: "0",
  stackable: false,
  isActive: true,
  maxUses: "",
});

const toForm = (p: Promotion): FormState => ({
  name: p.name,
  code: p.code ?? "",
  type: p.type,
  value: p.value,
  minSpend: p.minSpend ?? "",
  target: p.target,
  productId: p.productId ?? "",
  categoryId: p.categoryId ?? "",
  startsAt: p.startsAt ? String(p.startsAt).slice(0, 16) : "",
  endsAt: p.endsAt ? String(p.endsAt).slice(0, 16) : "",
  priority: String(p.priority ?? 0),
  stackable: Boolean(p.stackable),
  isActive: p.isActive !== false,
  maxUses: p.maxUses != null ? String(p.maxUses) : "",
});

const formBody = (form: FormState): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    code: form.code.trim() || null,
    type: form.type,
    value: form.value.trim(),
    minSpend: form.minSpend.trim() || null,
    target: form.target,
    productId: form.target === "PRODUCT" && form.productId.trim() ? form.productId.trim() : null,
    categoryId:
      form.target === "CATEGORY" && form.categoryId.trim() ? form.categoryId.trim() : null,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    priority: Number(form.priority) || 0,
    stackable: form.stackable,
    isActive: form.isActive,
    maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
  };
  return body;
};

export default function PromotionsPage() {
  const { can } = usePermission();
  const canManage = can("PROMOTIONS_MANAGE");

  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listPromotions());
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm(toForm(p));
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.value.trim()) {
      toastError("Name and value are required");
      return;
    }
    setSaving(true);
    try {
      const body = formBody(form);
      if (editing) {
        await updatePromotion(editing.id, body);
        toastSuccess("Promotion updated");
      } else {
        await createPromotion(body);
        toastSuccess("Promotion created");
      }
      setSheetOpen(false);
      setLoading(true);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Percent and fixed discounts, coupons, and min-spend offers."
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              Add promotion
            </Button>
          ) : null
        }
      />

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyState title="No promotions" description="Create a coupon or cart discount." />
      ) : null}

      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-text">{p.name}</h2>
                {p.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="neutral">Inactive</Badge>
                )}
                {p.code ? <Badge variant="info">{p.code}</Badge> : null}
              </div>
              <p className="text-sm text-text-muted">
                {promotionTypeLabel(p.type)} · value{" "}
                {p.type.includes("PERCENT") ? `${p.value}%` : formatMoney(p.value)}
                {p.minSpend ? ` · min ${formatMoney(p.minSpend)}` : ""}
                {" · "}
                {p.target}
                {p.product?.name ? ` · ${p.product.name}` : ""}
                {p.category?.name ? ` · ${p.category.name}` : ""}
              </p>
              <p className="text-xs text-text-muted">
                Priority {p.priority}
                {p.stackable ? " · stackable" : ""}
                {p.usageCount != null ? ` · used ${p.usageCount}` : ""}
                {p.startsAt || p.endsAt
                  ? ` · ${p.startsAt ? formatDate(p.startsAt) : "…"} → ${p.endsAt ? formatDate(p.endsAt) : "…"}`
                  : ""}
              </p>
            </div>
            {canManage ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(p)}>
                Edit
              </Button>
            ) : null}
          </Card>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit promotion" : "Add promotion"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 p-1">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Coupon code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Optional"
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as PromotionType }))
              }
            >
              {PROMOTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Input
              label={form.type.includes("PERCENT") ? "Percent" : "Amount (Birr)"}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              inputMode="decimal"
              required
            />
            {(form.type === "MIN_SPEND_PERCENT" || form.type === "MIN_SPEND_FIXED") && (
              <Input
                label="Minimum spend"
                value={form.minSpend}
                onChange={(e) => setForm((f) => ({ ...f, minSpend: e.target.value }))}
                inputMode="decimal"
              />
            )}
            <Select
              label="Target"
              value={form.target}
              onChange={(e) =>
                setForm((f) => ({ ...f, target: e.target.value as PromotionTarget }))
              }
            >
              {PROMOTION_TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            {form.target === "PRODUCT" ? (
              <Input
                label="Product ID"
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              />
            ) : null}
            {form.target === "CATEGORY" ? (
              <Input
                label="Category ID"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              />
            ) : null}
            <Input
              label="Starts"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
            <Input
              label="Ends"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
            <Input
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              inputMode="numeric"
            />
            <Input
              label="Max uses"
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              inputMode="numeric"
              placeholder="Unlimited"
            />
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={form.stackable}
                onChange={(e) => setForm((f) => ({ ...f, stackable: e.target.checked }))}
              />
              Stackable with other promos
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
            <Button type="button" onClick={() => void handleSave()} disabled={saving} fullWidth>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
