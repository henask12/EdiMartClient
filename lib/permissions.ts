/**
 * Permission keys: must match the API's `PermissionKey` enum. What each one means, how it is
 * grouped and which are sensitive is served by the API (GET /roles/permissions); this file only
 * needs the names so the app can ask "can this person do X?".
 */
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
  | "REPORTING_VIEW"
  | "SALES_VIEW_OWN"
  | "SALES_VIEW_ALL"
  | "SALES_VOID"
  | "SALES_REFUND"
  | "DISCOUNT_APPLY"
  | "DISCOUNT_ABOVE_LIMIT"
  | "PRICE_OVERRIDE"
  | "CASH_DRAWER_OPEN"
  | "SHIFT_MANAGE"
  | "SHIFT_VIEW_ALL"
  | "CUSTOMERS_VIEW"
  | "CUSTOMERS_MANAGE"
  | "CUSTOMER_CREDIT_MANAGE"
  | "PROMOTIONS_MANAGE"
  | "SUPPLIERS_MANAGE"
  | "PURCHASING_MANAGE"
  | "PURCHASE_APPROVE"
  | "SUPPLIER_PAYMENTS_MANAGE"
  | "STOCK_VIEW"
  | "STOCK_COUNT"
  | "STOCK_COUNT_APPROVE"
  | "STOCK_ADJUST"
  | "STOCK_TRANSFER"
  | "STOCK_WRITE_OFF"
  | "PRICES_MANAGE"
  | "LOCATIONS_MANAGE"
  | "LABELS_PRINT"
  | "REPORTS_VIEW_COST_PROFIT"
  | "EXPORTS_RUN"
  | "SETTINGS_MANAGE"
  | "AUDIT_VIEW";

export const hasPermission = (permissions: string[] | undefined, key: Permission) =>
  permissions?.includes(key) ?? false;

export const isOwnerRole = (role: string) => role === "OWNER";

/** What a page or button needs: ALL of `all`, and at least one of `any`. */
export type Requirement = { all?: Permission[]; any?: Permission[] };

export const meetsRequirement = (permissions: string[] | undefined, requirement?: Requirement) => {
  if (!requirement) return true;
  const { all = [], any = [] } = requirement;
  return (
    all.every((key) => hasPermission(permissions, key)) &&
    (any.length === 0 || any.some((key) => hasPermission(permissions, key)))
  );
};

/** The requirements that are not met (for a helpful "you need ..." message). */
export const missingFrom = (permissions: string[] | undefined, requirement?: Requirement): Permission[] => {
  if (!requirement) return [];
  const { all = [], any = [] } = requirement;
  const missingAll = all.filter((key) => !hasPermission(permissions, key));
  const anyMet = any.length === 0 || any.some((key) => hasPermission(permissions, key));
  return anyMet ? missingAll : [...missingAll, ...any];
};

const SALES_VIEW_ANY: Permission[] = ["SALES_VIEW", "SALES_VIEW_OWN", "SALES_VIEW_ALL"];

/**
 * What each page needs. The first matching prefix wins, so more specific paths come first. These
 * mirror what the API enforces; the API is the real gate, this just shows a clear message instead
 * of a page full of errors. Pages not listed (dashboard, my account) are open to everyone.
 */
export const ROUTE_REQUIREMENTS: { prefix: string; requires: Requirement }[] = [
  { prefix: "/products/import", requires: { all: ["PRODUCTS_CREATE"] } },
  { prefix: "/products/new", requires: { all: ["PRODUCTS_CREATE"] } },
  { prefix: "/products/", requires: { all: ["PRODUCTS_EDIT"] } },
  { prefix: "/products", requires: { all: ["PRODUCTS_VIEW"] } },
  { prefix: "/stock-counts/", requires: { all: ["STOCK_COUNT"] } },
  { prefix: "/pos", requires: { all: ["SALES_CREATE"] } },
  { prefix: "/sell", requires: { all: ["SALES_CREATE"] } },
  { prefix: "/shifts", requires: { any: ["SHIFT_MANAGE", "SHIFT_VIEW_ALL"] } },
  { prefix: "/sales", requires: { any: SALES_VIEW_ANY } },
  { prefix: "/settings/pos", requires: { all: ["SETTINGS_MANAGE"] } },
  { prefix: "/settings/purchasing", requires: { all: ["SETTINGS_MANAGE"] } },
  { prefix: "/purchase-orders/", requires: { all: ["PURCHASING_MANAGE"] } },
  { prefix: "/purchase-orders", requires: { all: ["PURCHASING_MANAGE"] } },
  { prefix: "/goods-receipts", requires: { all: ["PURCHASING_MANAGE"] } },
  { prefix: "/reorder", requires: { all: ["PURCHASING_MANAGE"] } },
  { prefix: "/supplier-returns", requires: { all: ["PURCHASING_MANAGE"] } },
  { prefix: "/supplier-bills", requires: { all: ["SUPPLIER_PAYMENTS_MANAGE"] } },
  { prefix: "/suppliers", requires: { any: ["SUPPLIERS_MANAGE", "PRODUCTS_VIEW"] } },
  { prefix: "/add-stock", requires: { all: ["STOCK_RECEIVE", "PRODUCTS_VIEW"] } },
  { prefix: "/inventory", requires: { all: ["STOCK_VIEW"] } },
  { prefix: "/stock-lookup", requires: { all: ["STOCK_VIEW"] } },
  { prefix: "/transfers", requires: { all: ["STOCK_TRANSFER"] } },
  { prefix: "/stock-counts", requires: { all: ["STOCK_COUNT"] } },
  { prefix: "/labels", requires: { all: ["LABELS_PRINT"] } },
  { prefix: "/expiry", requires: { all: ["STOCK_VIEW"] } },
  { prefix: "/reservations", requires: { all: ["RESERVATIONS_MANAGE"] } },
  { prefix: "/stock-history", requires: { all: ["STOCK_HISTORY_VIEW"] } },
  { prefix: "/categories", requires: { all: ["PRODUCTS_VIEW", "CATEGORIES_MANAGE"] } },
  { prefix: "/product-types", requires: { all: ["PRODUCTS_VIEW", "PRODUCT_TYPES_MANAGE"] } },
  { prefix: "/settings/locations", requires: { all: ["LOCATIONS_MANAGE"] } },
  { prefix: "/settings/users", requires: { all: ["USERS_MANAGE"] } },
  { prefix: "/settings/roles", requires: { all: ["ROLES_MANAGE"] } },
  { prefix: "/settings/emails", requires: { all: ["SETTINGS_EMAILS"] } },
  { prefix: "/design", requires: { all: ["ROLES_MANAGE"] } },
];

const pathMatches = (pathname: string, prefix: string) =>
  prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`);

export const requirementForPath = (pathname: string): Requirement | undefined =>
  ROUTE_REQUIREMENTS.find((r) => pathMatches(pathname, r.prefix))?.requires;

/** Plain-language names for the permissions pages ask for (falls back to the key itself). */
const NAMES: Partial<Record<Permission, string>> = {
  PRODUCTS_VIEW: "View products",
  PRODUCTS_CREATE: "Add products",
  PRODUCTS_EDIT: "Edit products",
  CATEGORIES_MANAGE: "Manage categories",
  PRODUCT_TYPES_MANAGE: "Manage product types",
  STOCK_VIEW: "View stock",
  STOCK_RECEIVE: "Receive stock",
  STOCK_HISTORY_VIEW: "View stock history",
  SALES_CREATE: "Record sales",
  SALES_VIEW: "Open the Sales page",
  SALES_VIEW_OWN: "View own sales",
  SALES_VIEW_ALL: "View all sales",
  SALES_VOID: "Void sales",
  SALES_REFUND: "Refund sales",
  DISCOUNT_APPLY: "Apply discounts",
  DISCOUNT_ABOVE_LIMIT: "Discount above limit",
  PRICE_OVERRIDE: "Override prices",
  CASH_DRAWER_OPEN: "Open cash drawer",
  SHIFT_MANAGE: "Manage shifts",
  SHIFT_VIEW_ALL: "View all shifts",
  RESERVATIONS_MANAGE: "Manage reservations",
  USERS_MANAGE: "Manage users",
  ROLES_MANAGE: "Manage roles",
  SETTINGS_EMAILS: "Manage alert e-mails",
  SETTINGS_MANAGE: "Manage store settings",
  REPORTING_VIEW: "View reports",
  REPORTS_VIEW_COST_PROFIT: "See cost and profit",
  SUPPLIERS_MANAGE: "Manage suppliers",
  PURCHASING_MANAGE: "Manage purchasing",
  PURCHASE_APPROVE: "Approve purchase orders",
  SUPPLIER_PAYMENTS_MANAGE: "Manage supplier payments",
};

export const permissionName = (key: Permission) => NAMES[key] ?? key;
