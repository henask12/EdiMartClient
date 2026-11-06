"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { toastError } from "@/lib/toast";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  createdAt: string;
  metadata?: unknown;
  user?: { email?: string; displayName?: string | null } | null;
};

export default function AuditLogPage() {
  const t = useTranslations("Audit");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action.trim()) params.set("action", action.trim());
      if (entity.trim()) params.set("entity", entity.trim());
      if (userId.trim()) params.set("userId", userId.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("take", "100");

      const res = await fetch(`/api/proxy/audit?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setMissing(true);
        setRows([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(
          typeof data.message === "string" ? data.message : t("loadFailed"),
        );
        return;
      }
      setMissing(false);
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as { items?: unknown })?.items)
          ? (data as { items: AuditRow[] }).items
          : [];
      setRows(list);
    } catch {
      toastError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [action, entity, userId, from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFilter = (e: FormEvent) => {
    e.preventDefault();
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <form
          onSubmit={handleFilter}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Input
            label={t("action")}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="SALE_CREATE"
          />
          <Input
            label={t("entity")}
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="Sale"
          />
          <Input
            label={t("userId")}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <Input
            type="date"
            label={t("from")}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            label={t("to")}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" fullWidth disabled={loading}>
              {t("applyFilters")}
            </Button>
          </div>
        </form>
      </Card>

      {missing ? (
        <EmptyState title={t("unavailable")} description={t("unavailableHint")} />
      ) : loading ? (
        <p className="text-sm text-text-muted">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t("when")}</th>
                <th className="px-3 py-2 font-medium">{t("action")}</th>
                <th className="px-3 py-2 font-medium">{t("entity")}</th>
                <th className="px-3 py-2 font-medium">{t("user")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-text-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-text">{row.action}</td>
                  <td className="px-3 py-2 text-text">
                    {row.entity}
                    {row.entityId ? (
                      <span className="text-text-muted"> · {row.entityId}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {row.user?.displayName ||
                      row.user?.email ||
                      row.userId ||
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
