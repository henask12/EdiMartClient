"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Check, Pencil, Trash2, X } from "@/lib/icons";
import { formatBirr } from "@/lib/format-price";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type Expense = {
  id: string;
  detail: string;
  amount: string;
  expenseDate: string;
  createdAt: string;
};

const DEFAULT_PAGE_SIZE = 15;

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [items],
  );

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      skip: String((page - 1) * pageSize),
      take: String(pageSize),
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/proxy/expenses?${params}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Failed to load expenses"));
      return;
    }
    const parsed = data as { items: Expense[]; total: number };
    setItems(parsed.items);
    setTotal(parsed.total);
  }, [from, to, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetCreateForm = () => {
    setDetail("");
    setAmount("");
    setExpenseDate("");
  };

  const handleApplyDates = () => {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setDateError("“From” must be on or before “To”.");
      return;
    }
    setDateError(null);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/proxy/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ detail, amount, expenseDate }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Failed to create expense"));
      setSaving(false);
      return;
    }
    toastSuccess("Expense added");
    resetCreateForm();
    setCreateOpen(false);
    setSaving(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await fetch(`/api/proxy/expenses/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Failed to delete expense"));
    } else {
      toastSuccess("Expense deleted");
      await load();
    }
    setDeletingId(null);
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditingDetail(expense.detail);
    setEditingAmount(expense.amount);
    setEditingDate(expense.expenseDate.slice(0, 10));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`/api/proxy/expenses/${editingId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        detail: editingDetail,
        amount: editingAmount,
        expenseDate: editingDate,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Failed to update expense"));
    } else {
      toastSuccess("Expense updated");
      setEditingId(null);
      await load();
    }
    setSaving(false);
  };

  const columns: DataTableColumn<Expense>[] = [
    {
      key: "detail",
      header: "Detail",
      render: (expense) =>
        editingId === expense.id ? (
          <Input
            value={editingDetail}
            onChange={(e) => setEditingDetail(e.target.value)}
            aria-label="Expense detail"
          />
        ) : (
          <span className="font-medium text-white">{expense.detail}</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      render: (expense) =>
        editingId === expense.id ? (
          <Input
            type="date"
            value={editingDate}
            onChange={(e) => setEditingDate(e.target.value)}
            aria-label="Expense date"
          />
        ) : (
          new Date(expense.expenseDate).toLocaleDateString()
        ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "tabular-nums",
      render: (expense) =>
        editingId === expense.id ? (
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={editingAmount}
            onChange={(e) => setEditingAmount(e.target.value)}
            aria-label="Expense amount"
          />
        ) : (
          formatBirr(expense.amount)
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (expense) =>
        editingId === expense.id ? (
          <div className="flex justify-end gap-2">
            <IconButton
              variant="primary"
              aria-label="Save expense"
              title="Save"
              icon={<Check />}
              onClick={() => void handleSaveEdit()}
              disabled={saving}
            />
            <IconButton
              variant="secondary"
              aria-label="Cancel edit"
              title="Cancel"
              icon={<X />}
              onClick={() => setEditingId(null)}
              disabled={saving}
            />
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <IconButton
              variant="secondary"
              aria-label="Edit expense"
              title="Edit"
              icon={<Pencil />}
              onClick={() => startEdit(expense)}
            />
            <IconButton
              variant="danger"
              aria-label="Delete expense"
              title="Delete"
              icon={<Trash2 />}
              onClick={() => void handleDelete(expense.id)}
              disabled={deletingId === expense.id}
            />
          </div>
        ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track expenses by detail, date, and amount."
        actions={
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Add expense
          </Button>
        }
      />

      <DateRangeFilter
        from={draftFrom}
        to={draftTo}
        onFromChange={setDraftFrom}
        onToChange={setDraftTo}
        onApply={handleApplyDates}
      />
      {dateError ? <p className="text-sm text-rose-200">{dateError}</p> : null}

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(expense) => expense.id}
        emptyMessage="No expenses yet."
        footer={{
          label: "Page subtotal",
          cells: {
            amount: <span className="tabular-nums">{formatBirr(String(subtotal))}</span>,
          },
        }}
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[10, 15, 25, 50]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Add expense</h2>
            <form className="mt-4 space-y-4" onSubmit={(e) => void handleCreate(e)}>
              <Input
                required
                label="Detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="What was this expense for?"
              />
              <Input
                required
                label="Date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
              <Input
                required
                label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" fullWidth disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
