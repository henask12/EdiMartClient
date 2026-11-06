/** Integer-cent helpers so POS totals avoid float drift. */

const toCents = (value: string | number | null | undefined): number => {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

export const moneyString = (cents: number): string => (cents / 100).toFixed(2);

export const addMoney = (...values: Array<string | number>): string =>
  moneyString(values.reduce<number>((sum, v) => sum + toCents(v), 0));

export const subMoney = (a: string | number, b: string | number): string =>
  moneyString(toCents(a) - toCents(b));

export const mulMoney = (unit: string | number, qty: number): string =>
  moneyString(toCents(unit) * qty);

export const pctOf = (amount: string | number, percent: string | number): string => {
  const p = typeof percent === "string" ? Number(percent) : percent;
  if (!Number.isFinite(p)) return "0.00";
  return moneyString(Math.round((toCents(amount) * p) / 100));
};

export const compareMoney = (a: string | number, b: string | number): number =>
  toCents(a) - toCents(b);

export const isZeroMoney = (value: string | number): boolean => toCents(value) === 0;

export const maxMoney = (a: string | number, b: string | number): string =>
  compareMoney(a, b) >= 0 ? moneyString(toCents(a)) : moneyString(toCents(b));

export const clampMoney = (value: string | number, min = "0", max?: string): string => {
  let cents = toCents(value);
  const minC = toCents(min);
  if (cents < minC) cents = minC;
  if (max != null && cents > toCents(max)) cents = toCents(max);
  return moneyString(cents);
};

export type CartTotals = {
  subtotal: string;
  lineDiscounts: string;
  cartDiscount: string;
  discountTotal: string;
  taxable: string;
  vat: string;
  total: string;
};

/**
 * VAT 15% inclusive (default): taxable = total / 1.15, vat = total - taxable.
 * Exclusive: vat = taxable * rate, total = taxable + vat.
 */
export const computeCartTotals = (
  lines: Array<{ unitPrice: string; qty: number; lineDiscount: string }>,
  cartDiscount: string,
  vatRatePercent: string,
  vatInclusive: boolean,
): CartTotals => {
  const gross = lines.reduce(
    (sum, line) => sum + toCents(line.unitPrice) * line.qty,
    0,
  );
  const lineDiscounts = lines.reduce((sum, line) => sum + toCents(line.lineDiscount), 0);
  const cartDisc = Math.min(toCents(cartDiscount), Math.max(0, gross - lineDiscounts));
  const discountTotal = lineDiscounts + cartDisc;
  const afterDiscount = Math.max(0, gross - discountTotal);
  const rate = Number(vatRatePercent);
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 15;

  if (vatInclusive) {
    const total = afterDiscount;
    const taxable = Math.round(total / (1 + safeRate / 100));
    const vat = total - taxable;
    return {
      subtotal: moneyString(gross),
      lineDiscounts: moneyString(lineDiscounts),
      cartDiscount: moneyString(cartDisc),
      discountTotal: moneyString(discountTotal),
      taxable: moneyString(taxable),
      vat: moneyString(vat),
      total: moneyString(total),
    };
  }

  const taxable = afterDiscount;
  const vat = Math.round((taxable * safeRate) / 100);
  return {
    subtotal: moneyString(gross),
    lineDiscounts: moneyString(lineDiscounts),
    cartDiscount: moneyString(cartDisc),
    discountTotal: moneyString(discountTotal),
    taxable: moneyString(taxable),
    vat: moneyString(vat),
    total: moneyString(taxable + vat),
  };
};

export const quickCashTenders = (
  due: string,
  denominations: string[],
): string[] => {
  const dueC = toCents(due);
  const exact = moneyString(dueC);
  const above = denominations
    .map((d) => toCents(d))
    .filter((c) => c > dueC)
    .sort((a, b) => a - b)
    .map(moneyString);
  const unique = [exact, ...above.filter((v, i, arr) => arr.indexOf(v) === i)];
  return unique.slice(0, 6);
};
