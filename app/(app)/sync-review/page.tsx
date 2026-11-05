"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  flushOutbox,
  listOutbox,
  removeOutboxItem,
  updateOutboxItem,
  type OutboxItem,
} from "@/lib/offline/outbox";
import {
  listRemoteConflicts,
  resolveRemoteConflict,
  type SyncConflict,
} from "@/lib/offline/sync-api";
import { toastError, toastSuccess } from "@/lib/toast";

export default function SyncReviewPage() {
  const t = useTranslations("SyncReview");
  const [localItems, setLocalItems] = useState<OutboxItem[]>([]);
  const [remote, setRemote] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, conflicts] = await Promise.all([
        listOutbox(),
        listRemoteConflicts(),
      ]);
      setLocalItems(rows);
      setRemote(conflicts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSyncAll = async () => {
    setBusyId("all");
    try {
      const result = await flushOutbox();
      toastSuccess(
        t("syncResult", {
          synced: result.synced,
          remaining: result.remaining,
        }),
      );
      await refresh();
    } catch {
      toastError(t("syncFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async (item: OutboxItem) => {
    setBusyId(item.id);
    try {
      await updateOutboxItem(item.id, { status: "pending", lastError: undefined });
      await flushOutbox();
      await refresh();
      toastSuccess(t("retried"));
    } catch {
      toastError(t("syncFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismissLocal = async (item: OutboxItem) => {
    if (!confirm(t("dismissConfirm"))) return;
    setBusyId(item.id);
    try {
      await removeOutboxItem(item.id);
      toastSuccess(t("dismissed"));
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveRemote = async (
    conflict: SyncConflict,
    resolution: "dismiss" | "retry",
  ) => {
    setBusyId(conflict.id);
    try {
      const result = await resolveRemoteConflict(conflict.id, resolution);
      if (result.missing) {
        toastSuccess(t("apiUnavailable"));
        setRemote((prev) => prev.filter((c) => c.id !== conflict.id));
        return;
      }
      if (!result.ok) {
        toastError(result.message ?? t("resolveFailed"));
        return;
      }
      toastSuccess(t("resolved"));
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const openLocal = localItems.filter(
    (i) => i.status === "conflict" || i.status === "failed" || i.status === "pending",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button
            type="button"
            onClick={() => void handleSyncAll()}
            disabled={busyId === "all"}
          >
            {busyId === "all" ? t("syncing") : t("syncNow")}
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-text-muted">{t("loading")}</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">{t("localQueue")}</h2>
        {openLocal.length === 0 ? (
          <EmptyState title={t("localEmpty")} description={t("localEmptyHint")} />
        ) : (
          openLocal.map((item) => (
            <Card key={item.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-text">
                    {item.label ?? item.id}
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.kind} · {item.status} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.lastError ? (
                    <p className="mt-1 text-sm text-danger" role="alert">
                      {item.lastError}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === item.id}
                    onClick={() => void handleRetry(item)}
                  >
                    {t("retry")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={busyId === item.id}
                    onClick={() => void handleDismissLocal(item)}
                  >
                    {t("dismiss")}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">{t("remoteConflicts")}</h2>
        {remote.length === 0 ? (
          <p className="text-sm text-text-muted">{t("remoteEmpty")}</p>
        ) : (
          remote.map((c) => (
            <Card key={c.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-text">
                    {c.kind ?? "conflict"} · {c.id}
                  </p>
                  {c.message ? (
                    <p className="text-sm text-text-muted">{c.message}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === c.id}
                    onClick={() => void handleResolveRemote(c, "retry")}
                  >
                    {t("retry")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={busyId === c.id}
                    onClick={() => void handleResolveRemote(c, "dismiss")}
                  >
                    {t("dismiss")}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
