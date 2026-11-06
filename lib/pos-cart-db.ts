import { get, set, del } from "idb-keyval";
import type { PosCartState, ParkedSale } from "@/lib/pos-types";

const CART_KEY = "edimart-pos-cart";
const PARKED_KEY = "edimart-pos-parked-local";

export const emptyCart = (): PosCartState => ({
  lines: [],
  cartDiscount: "0.00",
  cartDiscountReason: undefined,
  notes: "",
  updatedAt: Date.now(),
});

export const loadCart = async (): Promise<PosCartState> => {
  try {
    const stored = await get<PosCartState>(CART_KEY);
    if (!stored || !Array.isArray(stored.lines)) return emptyCart();
    return {
      lines: stored.lines,
      cartDiscount: stored.cartDiscount ?? "0.00",
      cartDiscountReason: stored.cartDiscountReason,
      notes: stored.notes ?? "",
      updatedAt: stored.updatedAt ?? Date.now(),
    };
  } catch {
    return emptyCart();
  }
};

export const saveCart = async (cart: PosCartState): Promise<void> => {
  try {
    await set(CART_KEY, { ...cart, updatedAt: Date.now() });
  } catch {
    /* IndexedDB unavailable — cart lives in memory only */
  }
};

export const clearCart = async (): Promise<void> => {
  try {
    await del(CART_KEY);
  } catch {
    /* ignore */
  }
};

/** Local fallback when API park endpoints are missing. */
export const loadLocalParked = async (): Promise<ParkedSale[]> => {
  try {
    const rows = await get<ParkedSale[]>(PARKED_KEY);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

export const saveLocalParked = async (rows: ParkedSale[]): Promise<void> => {
  try {
    await set(PARKED_KEY, rows);
  } catch {
    /* ignore */
  }
};
