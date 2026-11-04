/**
 * Format a money value for display.
 *
 * Takes a string (Prisma Decimal) or number and returns e.g. "Br 1,250.00".
 * Uses string parsing to avoid floating-point errors on Decimal strings.
 * The prefix can be overridden via the `prefix` option ("ETB" or "ብር").
 */

type FormatMoneyOptions = {
  /** Currency prefix. Default "Br" */
  prefix?: string;
  /** Show decimals. Default true */
  decimals?: boolean;
};

export const formatMoney = (
  value: string | number | null | undefined,
  options?: FormatMoneyOptions,
): string => {
  if (value == null) return "—";

  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";

  const prefix = options?.prefix ?? "Br";
  const showDecimals = options?.decimals !== false;

  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${prefix}\u00A0${formatted}`;
};

/**
 * Backward-compatible alias. Use `formatMoney` in new code.
 * @deprecated Use formatMoney instead.
 */
export const formatBirr = (value: string | number | null | undefined): string =>
  formatMoney(value);
