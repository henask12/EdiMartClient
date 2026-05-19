export type AppRole = "OWNER" | "CASHIER" | "STORE_STAFF" | "ONLINE_MANAGER";

export const canEditProduct = (role: string) =>
  role === "OWNER" || role === "STORE_STAFF";

export const canSellProduct = (role: string) =>
  role === "OWNER" || role === "CASHIER" || role === "STORE_STAFF";

export const canReserveProduct = (role: string) =>
  role === "OWNER" || role === "CASHIER" || role === "STORE_STAFF";

export const canRestockProduct = (role: string) =>
  role === "OWNER" || role === "STORE_STAFF";

export const canDeactivateProduct = (role: string) => role === "OWNER";
