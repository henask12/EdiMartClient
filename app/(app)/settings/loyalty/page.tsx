"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEFAULT_LOYALTY_SETTINGS,
  customersFetch,
  loyaltySettingsPatchBody,
  parseLoyaltySettings,
  type LoyaltySettings,
} from "@/lib/customers";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

export default function LoyaltySettingsPage() {
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await customersFetch("/settings/store");
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        setSettings(parseLoyaltySettings(data));
      } catch {
        setSettings(DEFAULT_LOYALTY_SETTINGS);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await customersFetch("/settings/store", {
        method: "PATCH",
        body: JSON.stringify(loyaltySettingsPatchBody(settings)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(parseApiMessage(data, "Could not save loyalty settings"));
      } else {
        toastSuccess("Loyalty settings saved");
      }
    } catch {
      toastError("Could not save loyalty settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty & credit defaults"
        description="Points earn/redeem rates and the default customer credit limit."
      />
      <Card className="max-w-md space-y-4 p-4">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
          />
          Loyalty enabled
        </label>
        <Input
          label="Points per Birr spent"
          value={settings.pointsPerBirr}
          onChange={(e) => setSettings((s) => ({ ...s, pointsPerBirr: e.target.value }))}
          hint="e.g. 0.1 = 1 point per Br 10"
          inputMode="decimal"
        />
        <Input
          label="Birr per redeem point"
          value={settings.birrPerRedeemPoint}
          onChange={(e) =>
            setSettings((s) => ({ ...s, birrPerRedeemPoint: e.target.value }))
          }
          hint="e.g. 0.1 = 100 points redeem as Br 10"
          inputMode="decimal"
        />
        <Input
          label="Default credit limit"
          value={settings.defaultCreditLimit}
          onChange={(e) =>
            setSettings((s) => ({ ...s, defaultCreditLimit: e.target.value }))
          }
          hint="Applied when creating customers without an explicit limit"
          inputMode="decimal"
        />
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Card>
    </div>
  );
}
