"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PwaInstall } from "@/components/PwaInstall";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  DEFAULT_POS_SETTINGS,
  type PosSettings,
} from "@/lib/pos-types";
import { parsePosSettings, persistLocalPosSettings, settingsPatchBody } from "@/lib/pos-settings";
import {
  DEFAULT_REGISTER_CODE,
  getStoredRegisterCode,
  getStoredRegisterId,
  isTillRegistered,
  setTillRegistration,
} from "@/lib/register-device";
import {
  DEFAULT_SHIFT_SETTINGS,
  fetchRegisters,
  parseShiftSettings,
  shiftSettingsPatchBody,
  type Register,
  type ShiftSettings,
} from "@/lib/shifts";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

export default function PosSettingsPage() {
  const t = useTranslations("Pos");
  const tShifts = useTranslations("Shifts");
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_POS_SETTINGS);
  const [shiftSettings, setShiftSettings] = useState<ShiftSettings>(DEFAULT_SHIFT_SETTINGS);
  const [favouritesRaw, setFavouritesRaw] = useState("");
  const [denomsRaw, setDenomsRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [tillOn, setTillOn] = useState(false);
  const [registerId, setRegisterId] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [res, regs] = await Promise.all([
          fetch("/api/proxy/settings/store", { cache: "no-store" }),
          fetchRegisters(),
        ]);
        const data = res.ok ? ((await res.json()) as Record<string, unknown>) : null;
        const parsed = parsePosSettings(data);
        setSettings(parsed);
        setFavouritesRaw(parsed.favourites.join(", "));
        setDenomsRaw(parsed.denominations.join(", "));
        setShiftSettings(parseShiftSettings(data));
        setRegisters(regs);
        setTillOn(isTillRegistered());
        const storedId = getStoredRegisterId();
        const preferred =
          regs.find((r) => r.id === storedId) ??
          regs.find((r) => r.code === DEFAULT_REGISTER_CODE) ??
          regs[0];
        setRegisterId(preferred?.id ?? storedId ?? "");
      } catch {
        const parsed = parsePosSettings(null);
        setSettings(parsed);
        setFavouritesRaw(parsed.favourites.join(", "));
        setDenomsRaw(parsed.denominations.join(", "));
        setShiftSettings(DEFAULT_SHIFT_SETTINGS);
        setTillOn(isTillRegistered());
        setRegisterId(getStoredRegisterId() ?? "");
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

    const reg = registers.find((r) => r.id === registerId);
    setTillRegistration({
      registered: tillOn,
      registerId: registerId || null,
      registerCode: reg?.code ?? getStoredRegisterCode(),
    });

    try {
      const res = await fetch("/api/proxy/settings/store", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...settingsPatchBody(next),
          ...shiftSettingsPatchBody(shiftSettings),
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
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("settingsTitle")} description={t("settingsDescription")} />

      <PwaInstall mode="card" force />

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
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text">{tShifts("settingsSection")}</h2>
        <label className="flex items-center gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={shiftSettings.requireOpenShift}
            onChange={(e) =>
              setShiftSettings((s) => ({ ...s, requireOpenShift: e.target.checked }))
            }
            className="size-4 rounded border-border"
          />
          {tShifts("requireOpenShift")}
        </label>
        <Input
          label={tShifts("varianceThreshold")}
          hint={tShifts("varianceThresholdHint")}
          value={shiftSettings.varianceApprovalThreshold}
          onChange={(e) =>
            setShiftSettings((s) => ({
              ...s,
              varianceApprovalThreshold: e.target.value,
            }))
          }
          inputMode="decimal"
        />
        <label className="flex items-center gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={shiftSettings.eodEmailEnabled}
            onChange={(e) =>
              setShiftSettings((s) => ({ ...s, eodEmailEnabled: e.target.checked }))
            }
            className="size-4 rounded border-border"
          />
          {tShifts("eodEmail")}
        </label>

        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold text-text">{tShifts("tillSection")}</h3>
          <label className="mb-3 flex items-center gap-3 text-sm text-text">
            <input
              type="checkbox"
              checked={tillOn}
              onChange={(e) => setTillOn(e.target.checked)}
              className="size-4 rounded border-border"
            />
            {tShifts("registerThisDevice")}
          </label>
          <Select
            label={tShifts("register")}
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            disabled={!tillOn}
          >
            {registers.length === 0 ? (
              <option value="">{DEFAULT_REGISTER_CODE}</option>
            ) : (
              registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))
            )}
          </Select>
          <p className="mt-2 text-xs text-text-muted">{tShifts("tillHint")}</p>
        </div>
      </div>

      <Button onClick={() => void handleSave()} disabled={saving} fullWidth>
        {saving ? t("completing") : t("saveSettings")}
      </Button>
    </section>
  );
}
