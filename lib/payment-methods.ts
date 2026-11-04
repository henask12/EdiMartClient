/** Payment methods the API accepts for a sale (must match the API's `PaymentMethod` enum). */
export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "TELEBIRR", label: "Telebirr" },
  { value: "CBE_BIRR", label: "CBE Birr" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card (bank terminal)" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

const LABELS: Record<string, string> = {
  ...Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label])),
  MOBILE_MONEY: "Mobile money", // older sales
};

export const paymentLabel = (method: string) => LABELS[method] ?? method;

/** Methods where the customer has a transaction ID worth recording. */
export const methodHasReference = (method: PaymentMethod) => method !== "CASH";
