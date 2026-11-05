import type { PaymentMethod } from "@/lib/payment-methods";

export type PosProduct = {
  id: string;
  name: string;
  nameAm?: string | null;
  sku?: string | null;
  sellingPrice: string;
  available: string;
  stockStatus?: "in_stock" | "low stock" | "out of stock" | string;
  imageUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  barcodes?: { barcode: string; isPrimary?: boolean }[];
};

export type PosCategory = {
  id: string;
  name: string;
};

export type PosCartLine = {
  id: string;
  productId: string;
  name: string;
  unitPrice: string;
  qty: number;
  lineDiscount: string;
  discountReason?: string;
  priceOverridden?: boolean;
  available?: string;
  flashedAt?: number;
};

export type PosCartState = {
  lines: PosCartLine[];
  cartDiscount: string;
  cartDiscountReason?: string;
  notes: string;
  updatedAt: number;
};

export type PosPaymentLine = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference?: string;
  proofPaths?: string[];
  proofPreviews?: string[];
};

export type PosSettings = {
  vatRate: string;
  vatInclusive: boolean;
  discountLimitPercent: string;
  returnWindowDays: string;
  receiptFooter: string;
  tin: string;
  scannerBeep: boolean;
  favourites: string[];
  denominations: string[];
};

export const DEFAULT_POS_SETTINGS: PosSettings = {
  vatRate: "15",
  vatInclusive: true,
  discountLimitPercent: "10",
  returnWindowDays: "7",
  receiptFooter: "Thank you for shopping at Edi's Collection",
  tin: "",
  scannerBeep: true,
  favourites: [],
  denominations: ["50", "100", "200", "500", "1000"],
};

export type ParkedSale = {
  id: string;
  label: string;
  cart: PosCartState;
  parkedAt: string;
  parkedBy?: string;
};

export type CheckoutResult = {
  id: string;
  saleNumber: string;
  grandTotal?: string;
  total?: string;
  changeDue?: string;
  receiptUrl?: string;
  payments?: { method: string; amount?: string; reference?: string | null }[];
  lines?: unknown[];
  createdAt?: string;
  replayed?: boolean;
  /** Local offline queue — server assigns the final sale number on sync. */
  pendingSync?: boolean;
};
