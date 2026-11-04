"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEFAULT_POS_SETTINGS,
  type PosSettings,
} from "@/lib/pos-types";
import { parsePosSettings, persistLocalPosSettings, settingsPatchBody } from "@/lib/pos-settings";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

export default function PosSettingsPage() {
  const t = useTranslations("Pos");
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_POS_SETTINGS);
  const [favouritesRaw, setFavouritesRaw] = useState("");
  const [denomsRaw, setDenomsRaw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/proxy/settings/store", { cache: "no-store" });
        const data = res.ok ? ((await res.json()) as Record<string, unknown>) : null;
        const parsed = parsePosSettings(data);
        setSettings(parsed);
        setFavouritesRaw(parsed.favourites.join(", "));
        setDenomsRaw(parsed.denominations.join(", "));
      } catch {
        const parsed = parsePosSettings(null);
        setSettings(parsed);
        setFavouritesRaw(parsed.favourites.join(", "));
        setDenomsRaw(parsed.denominations.join(", "));
      }
    })();
  }, []);

  const handleSave = async () => {
    const next: PosSettings = {
      ...settings,
      favourites: favouritesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      denominations: denomsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setSaving(true);
    persistLocalPosSettings(next);
    setSettings(next);
    try {
      const res = await fetch("/api/proxy/settings/store", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsPatchBody(next)),
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
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("settingsTitle")} description={t("settingsDescription")} />

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <Input
          label={t("vatRate")}
          value={settings.vatRate}
          onChange={(e) => setSettings((s) => ({ ...s, vatRate: e.target.value }))}
          inputMode="decimal"
        />
        <label className="flex items-center gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.vatInclusive}
            onChange={(e) => setSettings((s) => ({ ...s, vatInclusive: e.target.checked }))}
            className="size-4 rounded border-border"
          />
          {t("vatInclusive")}
        </label>
        <Input
          label={t("discountLimit")}
          value={settings.discountLimitPercent}
          onChange={(e) =>
            setSettings((s) => ({ ...s, discountLimitPercent: e.target.value }))
          }
          inputMode="decimal"
        />
        <Input
          label={t("returnWindow")}
          value={settings.returnWindowDays}
          onChange={(e) => setSettings((s) => ({ ...s, returnWindowDays: e.target.value }))}
          inputMode="numeric"
        />
        <Input
          label={t("tin")}
          value={settings.tin}
          onChange={(e) => setSettings((s) => ({ ...s, tin: e.target.value }))}
        />
        <Input
          label={t("receiptFooter")}
          value={settings.receiptFooter}
          onChange={(e) => setSettings((s) => ({ ...s, receiptFooter: e.target.value }))}
        />
        <label className="flex items-center gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.scannerBeep}
            onChange={(e) => setSettings((s) => ({ ...s, scannerBeep: e.target.checked }))}
            className="size-4 rounded border-border"
          />
          {t("scannerBeep")}
        </label>
        <Input
          label={t("favourites")}
          hint={t("favouritesHint")}
          value={favouritesRaw}
          onChange={(e) => setFavouritesRaw(e.target.value)}
        />
        <Input
          label={t("denominations")}
          hint={t("denominationsHint")}
          value={denomsRaw}
          onChange={(e) => setDenomsRaw(e.target.value)}
        />
        <Button onClick={() => void handleSave()} disabled={saving} fullWidth>
          {saving ? t("completing") : t("saveSettings")}
        </Button>
      </div>
    </section>
  );
}
