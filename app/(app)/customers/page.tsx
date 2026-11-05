"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePermission } from "@/components/PermissionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import {
  createCustomer,
  creditAvailable,
  listCustomers,
  type Customer,
} from "@/lib/customers";
import { formatMoney } from "@/lib/format-money";
import { toastError, toastSuccess } from "@/lib/toast";

type FormState = {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  notes: string;
  tags: string;
  creditLimit: string;
};

const emptyForm = (): FormState => ({
  name: "",
  phone: "",
  email: "",
  birthday: "",
  notes: "",
  tags: "",
  creditLimit: "",
});

export default function CustomersPage() {
  const { can } = usePermission();
  const canManage = can("CUSTOMERS_MANAGE");
  const canCredit = can("CUSTOMER_CREDIT_MANAGE");

  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listCustomers(q.trim() || undefined));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toastError("Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        birthday: form.birthday.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags: tags.length ? tags : undefined,
        creditLimit: canCredit && form.creditLimit.trim() ? form.creditLimit.trim() : undefined,
      });
      toastSuccess("Customer created");
      setSheetOpen(false);
      setForm(emptyForm());
      setLoading(true);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Profiles, credit, and loyalty."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" asChild>
              <Link href="/customers/overdue">Overdue credit</Link>
            </Button>
            {canManage ? (
              <Button
                type="button"
                onClick={() => {
                  setForm(emptyForm());
                  setSheetOpen(true);
                }}
              >
                Add customer
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="p-4">
        <Input
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or phone…"
          aria-label="Search customers"
        />
      </Card>

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description={canManage ? "Add a customer with a name and phone." : undefined}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => {
          const available = creditAvailable(c);
          return (
            <Card key={c.id} className="space-y-2 p-4">
              <Link href={`/customers/${c.id}`} className="block focus-ring rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-text">{c.name}</h2>
                  {c.isActive === false ? <Badge variant="neutral">Inactive</Badge> : null}
                </div>
                <p className="mt-1 text-sm tabular-nums text-text-muted">{c.phone}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div>
                    <p>Owes</p>
                    <p className="tabular-nums font-medium text-text">
                      {formatMoney(c.creditBalance)}
                    </p>
                  </div>
                  <div>
                    <p>Store credit</p>
                    <p className="tabular-nums font-medium text-text">
                      {formatMoney(c.storeCreditBalance)}
                    </p>
                  </div>
                  <div>
                    <p>Credit available</p>
                    <p className="tabular-nums font-medium text-text">{formatMoney(available)}</p>
                  </div>
                  <div>
                    <p>Points</p>
                    <p className="tabular-nums font-medium text-text">{c.loyaltyPoints ?? 0}</p>
                  </div>
                </div>
                {c.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Link>
            </Card>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add customer</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 p-1">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="09…"
              hint="Sent as typed; API normalizes to +251…"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
            />
            <Input
              label="Tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="VIP, staff…"
              hint="Comma-separated"
            />
            {canCredit ? (
              <Input
                label="Credit limit"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                inputMode="decimal"
              />
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-muted">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </label>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving} fullWidth>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
