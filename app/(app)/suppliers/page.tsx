"use client";

import { useCallback, useEffect, useState } from "react";
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
import { formatMoney } from "@/lib/format-money";
import {
  createSupplier,
  getSupplier,
  linkSupplierProduct,
  listProducts,
  listSuppliers,
  updateSupplier,
  type ProductOption,
  type Supplier,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";

type FormState = {
  name: string;
  phone: string;
  telegram: string;
  tin: string;
  leadTimeDays: string;
  minimumOrder: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  phone: "",
  telegram: "",
  tin: "",
  leadTimeDays: "7",
  minimumOrder: "0",
  notes: "",
});

export default function SuppliersPage() {
  const t = useTranslations("Purchasing");
  const { can, canSeeCost } = usePermission();
  const canManage = can("SUPPLIERS_MANAGE");

  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [linkProductId, setLinkProductId] = useState("");
  const [linkCost, setLinkCost] = useState("");
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listSuppliers(q.trim() || undefined));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void listProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone ?? "",
      telegram: s.telegram ?? "",
      tin: s.tin ?? "",
      leadTimeDays: String(s.leadTimeDays ?? 7),
      minimumOrder: s.minimumOrder ?? "0",
      notes: s.notes ?? "",
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toastError("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        telegram: form.telegram.trim() || null,
        tin: form.tin.trim() || null,
        leadTimeDays: Number(form.leadTimeDays) || 7,
        minimumOrder: form.minimumOrder || "0",
        notes: form.notes.trim() || null,
        currency: "ETB",
      };
      if (editing) {
        await updateSupplier(editing.id, body);
        toastSuccess("Supplier updated");
      } else {
        await createSupplier(body);
        toastSuccess("Supplier created");
      }
      setSheetOpen(false);
      await load();
      if (detail && editing?.id === detail.id) {
        setDetail(await getSupplier(detail.id));
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await getSupplier(id));
      setLinkProductId("");
      setLinkCost("");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load supplier");
    }
  };

  const handleLink = async () => {
    if (!detail || !linkProductId) return;
    setLinking(true);
    try {
      await linkSupplierProduct(detail.id, {
        productId: linkProductId,
        lastCost: canSeeCost && linkCost ? linkCost : undefined,
      });
      toastSuccess("Product linked");
      setDetail(await getSupplier(detail.id));
      setLinkProductId("");
      setLinkCost("");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not link product");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("suppliers")}
        description={t("suppliersDescription")}
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              {t("addSupplier")}
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        <Input
          label={t("searchProduct").replace("…", "") || "Search"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search suppliers…"
        />
      </Card>

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyState title={t("noSuppliers")} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Card key={s.id} className="space-y-2 p-4">
            <button
              type="button"
              className="w-full text-left focus-ring"
              onClick={() => void openDetail(s.id)}
              aria-label={`Open ${s.name}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-text">{s.name}</h2>
                {!s.isActive ? <Badge variant="neutral">Inactive</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {s.phone || "—"} · lead {s.leadTimeDays}d
              </p>
              {s.tin ? <p className="text-xs text-text-muted">TIN {s.tin}</p> : null}
            </button>
            {canManage ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(s)}>
                {t("editSupplier")}
              </Button>
            ) : null}
          </Card>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? t("editSupplier") : t("addSupplier")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 p-1">
            <Input
              label={t("name")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label={t("phone")}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label={t("telegram")}
              value={form.telegram}
              onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
            />
            <Input
              label={t("tin")}
              value={form.tin}
              onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))}
            />
            <Input
              label={t("leadTimeDays")}
              value={form.leadTimeDays}
              onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
            />
            <Input
              label={t("minimumOrder")}
              value={form.minimumOrder}
              onChange={(e) => setForm((f) => ({ ...f, minimumOrder: e.target.value }))}
            />
            <Input
              label={t("notes")}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 p-1">
                <p className="text-sm text-text-muted">
                  {detail.phone || "—"}
                  {detail.telegram ? ` · TG ${detail.telegram}` : ""}
                  {detail.tin ? ` · TIN ${detail.tin}` : ""}
                </p>
                <p className="text-sm text-text-muted">
                  Lead {detail.leadTimeDays}d · min order {formatMoney(detail.minimumOrder)}
                </p>
                {detail.notes ? <p className="text-sm text-text">{detail.notes}</p> : null}

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-text">{t("linkedProducts")}</h3>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {(detail.products ?? []).map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 px-3 py-2 text-sm">
                        <span className="text-text">{p.product?.name ?? p.productId}</span>
                        {canSeeCost && p.lastCost != null ? (
                          <span className="tabular-nums text-text-muted">
                            {formatMoney(p.lastCost)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                    {(detail.products ?? []).length === 0 ? (
                      <li className="px-3 py-2 text-sm text-text-muted">None linked</li>
                    ) : null}
                  </ul>
                </div>

                {canManage ? (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-text">{t("linkProduct")}</p>
                    <Select
                      label={t("product")}
                      value={linkProductId}
                      onChange={(e) => {
                        setLinkProductId(e.target.value);
                        const p = products.find((x) => x.id === e.target.value);
                        if (p?.costPrice) setLinkCost(p.costPrice);
                      }}
                    >
                      <option value="">Choose…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                    {canSeeCost ? (
                      <Input
                        label={t("lastCost")}
                        value={linkCost}
                        onChange={(e) => setLinkCost(e.target.value)}
                      />
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!linkProductId || linking}
                      onClick={() => void handleLink()}
                    >
                      {t("linkProduct")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
