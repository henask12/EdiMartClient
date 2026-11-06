"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { listOverdueCustomers, type OverdueCustomer } from "@/lib/customers";
import { formatMoney } from "@/lib/format-money";
import { toastError } from "@/lib/toast";

export default function OverdueCustomersPage() {
  const [items, setItems] = useState<OverdueCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listOverdueCustomers());
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load overdue list");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overdue credit"
        description="Customers with an outstanding account balance."
        actions={
          <div className="flex gap-2">
            <Link href="/customers" className={buttonVariants({ variant: "secondary" })}>
              All customers
            </Link>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <EmptyState title="No overdue balances" description="Everyone is paid up." />
      ) : null}

      <div className="space-y-3">
        {items.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link
                href={`/customers/${c.id}`}
                className="font-semibold text-text focus-ring hover:text-primary"
              >
                {c.name}
              </Link>
              <p className="text-sm tabular-nums text-text-muted">{c.phone}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {typeof c.daysOverdue === "number" ? (
                <Badge variant="warning">{c.daysOverdue}d overdue</Badge>
              ) : (
                <Badge variant="warning">Overdue</Badge>
              )}
              <span className="tabular-nums font-semibold text-text">
                {formatMoney(c.overdueAmount ?? c.creditBalance)}
              </span>
              <Link
                href={`/customers/${c.id}`}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Open
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
