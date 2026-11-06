"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const AccessDenied = ({ needs }: { needs?: string[] }) => {
  const t = useTranslations("AccessDenied");

  return (
    <EmptyState
      icon={<ShieldX />}
      title={t("title")}
      description={t("description")}
      action={
        <div className="space-y-3 text-center">
          {needs && needs.length > 0 ? (
            <p className="text-sm text-text-muted">
              {t("needs", { permissions: needs.join(", ") })}
            </p>
          ) : null}
          <Link href="/dashboard">
            <Button variant="secondary">{t("backHome")}</Button>
          </Link>
        </div>
      }
    />
  );
};
