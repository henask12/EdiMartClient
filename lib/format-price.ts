/** Format API decimal price strings for display in birr. */
export const formatBirr = (value: string | number) => {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n.toLocaleString("en-ET", { maximumFractionDigits: 0 })} birr`;
};
