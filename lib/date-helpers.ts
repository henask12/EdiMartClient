/**
 * Date formatting helpers for the business time zone (Africa/Addis_Ababa, UTC+3, no DST).
 * All dates are stored as UTC; display uses the business time zone.
 */

export const BUSINESS_TZ = "Africa/Addis_Ababa";

const gregorianFull = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const gregorianShort = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const gregorianDateOnly = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "3 Nov 2026, 14:55" */
export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return gregorianFull.format(d);
};

/** "3 Nov 2026" */
export const formatDateShort = (value: string | Date | null | undefined): string => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return gregorianShort.format(d);
};

/** "2026-11-03" in business time zone */
export const toDateInput = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return gregorianDateOnly.format(d);
};

/**
 * Ethiopian calendar date. Uses Intl with calendar: 'ethiopic'.
 * Returns null if the browser does not support it.
 */
let ethiopicSupported: boolean | null = null;
let ethiopicFormatter: Intl.DateTimeFormat | null = null;

const getEthiopicFormatter = (): Intl.DateTimeFormat | null => {
  if (ethiopicSupported === false) return null;
  if (ethiopicFormatter) return ethiopicFormatter;
  try {
    const f = new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
      timeZone: BUSINESS_TZ,
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const test = f.format(new Date(2026, 0, 1));
    if (!test || test.includes("NaN")) {
      ethiopicSupported = false;
      return null;
    }
    ethiopicSupported = true;
    ethiopicFormatter = f;
    return f;
  } catch {
    ethiopicSupported = false;
    return null;
  }
};

/** Returns the Ethiopian calendar date string, or null if unsupported. */
export const formatEthiopianDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const f = getEthiopicFormatter();
  if (!f) return null;
  return f.format(d);
};

/** Whether the browser supports the Ethiopian calendar. */
export const isEthiopianCalendarSupported = (): boolean => {
  getEthiopicFormatter();
  return ethiopicSupported === true;
};
