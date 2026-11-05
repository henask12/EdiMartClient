"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  creditAvailable,
  getCustomer,
  getCustomerLedger,
  getCustomerStatement,
  repayCustomer,
  setCustomerCreditLimit,
  updateCustomer,
  type CustomerLedgerEntry,
  type CustomerProfile,
  type CustomerStatement,
} from "@/lib/customers";
import { formatDate, formatDateShort } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { toastError, toastSuccess } from "@/lib/toast";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { can } = usePermission();
  const canManage = can("CUSTOMERS_MANAGE");
  const canCredit = can("CUSTOMER_CREDIT_MANAGE");

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    notes: "",
    tags: "",
  });
  const [repayForm, setRepayForm] = useState({
    amount: "",
    method: "CASH",
    reference: "",
    notes: "",
  });
  const [newLimit, setNewLimit] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, led] = await Promise.all([getCustomer(id), getCustomerLedger(id)]);
      setProfile(p);
      setLedger(led);
      setEditForm({
        name: p.name,
        phone: p.phone,
        email: p.email ?? "",
        birthday: p.birthday ? String(p.birthday).slice(0, 10) : "",
        notes: p.notes ?? "",
        tags: (p.tags ?? []).join(", "),
      });
      setNewLimit(p.creditLimit ?? "0");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load customer");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const sales = useMemo(
    () => profile?.sales ?? profile?.history ?? [],
    [profile],
  );

  const statementEntries = useMemo(
    () => statement?.entries ?? statement?.lines ?? [],
    [statement],
  );

  const handleSaveEdit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const tags = editForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await updateCustomer(profile.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        birthday: editForm.birthday.trim() || null,
        notes: editForm.notes.trim() || null,
        tags,
      });
      toastSuccess("Customer updated");
      setEditOpen(false);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRepay = async () => {
    if (!profile) return;
    if (!repayForm.amount.trim()) {
      toastError("Enter an amount");
      return;
    }
    setSaving(true);
    try {
      await repayCustomer(profile.id, {
        amount: repayForm.amount.trim(),
        method: repayForm.method || undefined,
        reference: repayForm.reference.trim() || undefined,
        notes: repayForm.notes.trim() || undefined,
      });
      toastSuccess("Repayment recorded");
      setRepayOpen(false);
      setRepayForm({ amount: "", method: "CASH", reference: "", notes: "" });
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Repayment failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLimit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await setCustomerCreditLimit(profile.id, newLimit.trim() || "0");
      toastSuccess("Credit limit updated");
      setLimitOpen(false);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not update limit");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadStatement = async () => {
    if (!profile) return;
    try {
      const s = await getCustomerStatement(profile.id);
      setStatement(s);
      setShowStatement(true);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load statement");
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted">Loading customer…</p>;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Customer not found"
        description="They may have been removed, or you don't have access."
      />
    );
  }

  const available = creditAvailable(profile);

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.name}
        description={profile.phone}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" asChild>
              <Link href="/customers">Back</Link>
            </Button>
            {canManage ? (
              <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            ) : null}
            {canCredit ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setLimitOpen(true)}>
                  Credit limit
                </Button>
                <Button type="button" onClick={() => setRepayOpen(true)}>
                  Record repayment
                </Button>
              </>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => void handleLoadStatement()}>
              Statement
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Total spend</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-text">
            {formatMoney(profile.totalSpend ?? "0")}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Avg basket</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-text">
            {formatMoney(profile.averageBasket ?? "0")}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Account balance</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-text">
            {formatMoney(profile.creditBalance)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Limit {formatMoney(profile.creditLimit)} · available {formatMoney(available)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Loyalty</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-text">
            {profile.loyaltyPoints ?? 0} pts
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Store credit {formatMoney(profile.storeCreditBalance)}
            {profile.loyaltyTier ? ` · ${profile.loyaltyTier}` : ""}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-text">Profile</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Email</dt>
              <dd>{profile.email || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Birthday</dt>
              <dd>{profile.birthday ? formatDateShort(profile.birthday) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Last visit</dt>
              <dd>{profile.lastVisit ? formatDate(profile.lastVisit) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Notes</dt>
              <dd className="max-w-[60%] text-right">{profile.notes || "—"}</dd>
            </div>
          </dl>
          {profile.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {profile.tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {profile.favouriteCategories?.length ? (
            <div>
              <p className="mb-1 text-xs text-text-muted">Favourite categories</p>
              <p className="text-sm text-text">
                {profile.favouriteCategories.map((c) => c.name).join(", ")}
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-text">Sales history</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-text-muted">No sales linked yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sales.slice(0, 20).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/sales/${s.id}`} className="font-medium text-primary focus-ring">
                    {s.saleNumber}
                  </Link>
                  <span className="tabular-nums text-text-muted">
                    {formatMoney(s.grandTotal ?? s.total)}
                  </span>
                  <span className="text-xs text-text-muted">{formatDate(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold text-text">Account ledger</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-text-muted">No ledger entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium text-right">Amount</th>
                  <th className="py-2 pr-3 font-medium text-right">Balance</th>
                  <th className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="py-2 pr-3 text-text-muted">{formatDate(row.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="neutral">{row.kind}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatMoney(row.balanceAfter)}
                    </td>
                    <td className="py-2 text-text-muted">
                      {row.sale?.saleNumber ? (
                        <Link href={`/sales/${row.saleId}`} className="text-primary focus-ring">
                          {row.sale.saleNumber}
                        </Link>
                      ) : null}
                      {row.notes ? ` ${row.notes}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showStatement && statement ? (
        <Card className="statement-print space-y-4 p-6 print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Account statement</h2>
              <p className="text-sm text-text-muted">
                {profile.name} · {profile.phone}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="print:hidden"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p>
              Opening:{" "}
              <span className="tabular-nums font-medium">
                {formatMoney(statement.openingBalance ?? "0")}
              </span>
            </p>
            <p>
              Closing:{" "}
              <span className="tabular-nums font-medium">
                {formatMoney(
                  statement.closingBalance ??
                    statement.creditBalance ??
                    profile.creditBalance,
                )}
              </span>
            </p>
            <p>
              Store credit:{" "}
              <span className="tabular-nums font-medium">
                {formatMoney(
                  statement.storeCreditBalance ?? profile.storeCreditBalance,
                )}
              </span>
            </p>
          </div>
          {statementEntries.length === 0 ? (
            <p className="text-sm text-text-muted">No statement lines.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-text-muted">
                  <th className="py-2">Date</th>
                  <th className="py-2">Kind</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statementEntries.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2">{formatDateShort(row.createdAt)}</td>
                    <td className="py-2">{row.kind}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(row.amount)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(row.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : null}

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit customer</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Birthday"
              type="date"
              value={editForm.birthday}
              onChange={(e) => setEditForm((f) => ({ ...f, birthday: e.target.value }))}
            />
            <Input
              label="Tags"
              value={editForm.tags}
              onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-text-muted">Notes</span>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </label>
            <Button type="button" onClick={() => void handleSaveEdit()} disabled={saving} fullWidth>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={repayOpen} onOpenChange={setRepayOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record repayment</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-text-muted">
              Balance owed: {formatMoney(profile.creditBalance)}
            </p>
            <Input
              label="Amount"
              value={repayForm.amount}
              onChange={(e) => setRepayForm((f) => ({ ...f, amount: e.target.value }))}
              inputMode="decimal"
            />
            <Select
              label="Method"
              value={repayForm.method}
              onChange={(e) => setRepayForm((f) => ({ ...f, method: e.target.value }))}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Input
              label="Reference"
              value={repayForm.reference}
              onChange={(e) => setRepayForm((f) => ({ ...f, reference: e.target.value }))}
            />
            <Input
              label="Notes"
              value={repayForm.notes}
              onChange={(e) => setRepayForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Button type="button" onClick={() => void handleRepay()} disabled={saving} fullWidth>
              {saving ? "Saving…" : "Record"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={limitOpen} onOpenChange={setLimitOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Credit limit</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              label="New limit (Birr)"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              inputMode="decimal"
            />
            <Button type="button" onClick={() => void handleLimit()} disabled={saving} fullWidth>
              {saving ? "Saving…" : "Update limit"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
