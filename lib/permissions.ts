/** Permission keys — must match API `PermissionKey` enum. */
export type Permission =
  | "PRODUCTS_VIEW"
  | "PRODUCTS_CREATE"
  | "PRODUCTS_EDIT"
  | "PRODUCTS_DEACTIVATE"
  | "PRODUCTS_SELL"
  | "PRODUCTS_RESERVE"
  | "PRODUCTS_RESTOCK"
  | "PRODUCTS_EXPORT"
  | "CATEGORIES_MANAGE"
  | "PRODUCT_TYPES_MANAGE"
  | "STOCK_RECEIVE"
  | "STOCK_HISTORY_VIEW"
  | "SALES_CREATE"
  | "SALES_VIEW"
  | "SALES_EXPORT"
  | "RESERVATIONS_MANAGE"
  | "USERS_MANAGE"
  | "ROLES_MANAGE"
  | "SETTINGS_EMAILS"
  | "REPORTING_VIEW";

export const PERMISSION_LABELS: Record<Permission, string> = {
  PRODUCTS_VIEW: "View products",
  PRODUCTS_CREATE: "Create products",
  PRODUCTS_EDIT: "Edit products",
  PRODUCTS_DEACTIVATE: "Deactivate products",
  PRODUCTS_SELL: "Sell products",
  PRODUCTS_RESERVE: "Reserve stock",
  PRODUCTS_RESTOCK: "Restock products",
  PRODUCTS_EXPORT: "Export product list",
  CATEGORIES_MANAGE: "Manage categories",
  PRODUCT_TYPES_MANAGE: "Manage product types",
  STOCK_RECEIVE: "Receive stock",
  STOCK_HISTORY_VIEW: "View stock history",
  SALES_CREATE: "Record sales",
  SALES_VIEW: "View sales",
  SALES_EXPORT: "Export sales",
  RESERVATIONS_MANAGE: "Manage reservations",
  USERS_MANAGE: "Manage users",
  ROLES_MANAGE: "Manage role permissions",
  SETTINGS_EMAILS: "Manage alert emails",
  REPORTING_VIEW: "View reports",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

export const hasPermission = (permissions: string[] | undefined, key: Permission) =>
  permissions?.includes(key) ?? false;

export const isOwnerRole = (role: string) => role === "OWNER";
