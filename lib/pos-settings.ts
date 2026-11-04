import {
  DEFAULT_POS_SETTINGS,
  type PosSettings,
} from "@/lib/pos-types";

const FAV_KEY = "edimart-pos-favourites";
const BEEP_KEY = "edimart-pos-scanner-beep";
const LOCAL_SETTINGS_KEY = "edimart-pos-settings";

const asStringArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      /* ignore */
    }
  }
  return null;
};

const getSetting = (
  api: Record<string, unknown> | null | undefined,
  key: string,
): unknown => api?.[key];

/** Merge API store settings (flat string map) with local fallbacks. */
export const parsePosSettings = (
  api: Record<string, unknown> | null | undefined,
): PosSettings => {
  const base = { ...DEFAULT_POS_SETTINGS };
  let local: Partial<PosSettings> = {};
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) local = JSON.parse(raw) as Partial<PosSettings>;
  } catch {
    /* ignore */
  }

  const favLocal = (() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      return null;
    }
  })();

  const beepLocal = (() => {
    try {
      const raw = localStorage.getItem(BEEP_KEY);
      if (raw === "0") return false;
      if (raw === "1") return true;
    } catch {
      /* ignore */
    }
    return undefined;
  })();

  const favourites =
    asStringArray(getSetting(api, "pos.favourites")) ??
    asStringArray(local.favourites) ??
    favLocal ??
    base.favourites;

  const denominations =
    asStringArray(getSetting(api, "pos.cashDenominations")) ??
    asStringArray(local.denominations) ??
    base.denominations;

  const scannerBeepRaw = getSetting(api, "pos.scannerBeep");
  const scannerBeep =
    scannerBeepRaw === "false" || scannerBeepRaw === "0"
      ? false
      : scannerBeepRaw === "true" || scannerBeepRaw === "1"
        ? true
        : beepLocal ?? local.scannerBeep ?? base.scannerBeep;

  const includeVatRaw = getSetting(api, "pos.pricesIncludeVat");

  return {
    vatRate: String(getSetting(api, "pos.vatRate") ?? local.vatRate ?? base.vatRate),
    vatInclusive:
      includeVatRaw !== undefined
        ? String(includeVatRaw) !== "false"
        : local.vatInclusive ?? base.vatInclusive,
    discountLimitPercent: String(
      getSetting(api, "pos.discountLimitPercent") ??
        local.discountLimitPercent ??
        base.discountLimitPercent,
    ),
    returnWindowDays: String(
      getSetting(api, "pos.returnWindowDays") ??
        local.returnWindowDays ??
        base.returnWindowDays,
    ),
    receiptFooter: String(
      getSetting(api, "pos.receiptFooter") ?? local.receiptFooter ?? base.receiptFooter,
    ),
    tin: String(
      getSetting(api, "pos.receiptTin") ?? local.tin ?? base.tin,
    ),
    scannerBeep,
    favourites,
    denominations,
  };
};

export const persistLocalPosSettings = (settings: PosSettings): void => {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(FAV_KEY, JSON.stringify(settings.favourites));
    localStorage.setItem(BEEP_KEY, settings.scannerBeep ? "1" : "0");
  } catch {
    /* ignore */
  }
};

/** PATCH body using API camelCase aliases; all values must be strings. */
export const settingsPatchBody = (settings: PosSettings): Record<string, string> => ({
  vatRate: settings.vatRate,
  pricesIncludeVat: String(settings.vatInclusive),
  discountLimitPercent: settings.discountLimitPercent,
  returnWindowDays: settings.returnWindowDays,
  receiptFooter: settings.receiptFooter,
  receiptTin: settings.tin,
  scannerBeep: String(settings.scannerBeep),
  favourites: JSON.stringify(settings.favourites),
  cashDenominations: JSON.stringify(
    settings.denominations.map((d) => {
      const n = Number(d);
      return Number.isFinite(n) ? n : d;
    }),
  ),
});
