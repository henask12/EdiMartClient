"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOutboxStatus } from "@/lib/offline/use-outbox-status";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  compact?: boolean;
};

export const OfflineBanner = ({ className, compact }: Props) => {
  const t = useTranslations("Offline");
  const { online, pendingSales, needsAttention, syncing } = useOutboxStatus();

  if (online && pendingSales === 0 && needsAttention === 0 && !syncing) {
    return null;
  }

  const message = !online
    ? pendingSales > 0
      ? t("offlineWaiting", { count: pendingSales })
      : t("offline")
    : syncing
      ? t("syncing")
      : needsAttention > 0
        ? t("needsReview", { count: needsAttention })
        : pendingSales > 0
          ? t("waitingSync", { count: pendingSales })
          : null;

  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b px-3 py-2 text-sm",
        !online
          ? "border-warning/40 bg-warning-soft text-warning"
          : needsAttention > 0
            ? "border-danger/40 bg-danger-soft text-danger"
            : "border-info/40 bg-info-soft text-info",
        compact && "py-1.5 text-xs",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">{message}</span>
      {needsAttention > 0 || pendingSales > 0 ? (
        <Link
          href="/sync-review"
          className="shrink-0 underline underline-offset-2 focus-ring rounded"
        >
          {t("review")}
        </Link>
      ) : null}
    </div>
  );
};
