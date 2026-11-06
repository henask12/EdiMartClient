"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEFAULT_PO_APPROVE_THRESHOLD,
  parsePoApproveThreshold,
  purchasingFetch,
} from "@/lib/purchasing";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

export default function PurchasingSettingsPage() {
  const t = useTranslations("Purchasing");
  const [threshold, setThreshold] = useState(DEFAULT_PO_APPROVE_THRESHOLD);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await purchasingFetch("/settings/store");
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        setThreshold(parsePoApproveThreshold(data));
      } catch {
        setThreshold(DEFAULT_PO_APPROVE_THRESHOLD);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await purchasingFetch("/settings/store", {
        method: "PATCH",
        body: JSON.stringify({
          poApproveThreshold: threshold,
          "purchasing.poApproveThreshold": threshold,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(parseApiMessage(data, t("settingsSaveFailed")));
      } else {
        toastSuccess(t("settingsSaved"));
      }
    } catch {
      toastError(t("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("settingsTitle")} description={t("settingsDescription")} />
      <Card className="max-w-md space-y-4 p-4">
        <Input
          label={t("poApproveThreshold")}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <p className="text-xs text-text-muted">
          Draft POs with a subtotal above this amount need the PURCHASE_APPROVE permission.
          Default is Br 10,000. Currency is ETB.
        </p>
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Card>
    </div>
  );
}
