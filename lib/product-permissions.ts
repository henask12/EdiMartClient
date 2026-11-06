import { hasPermission } from "@/lib/permissions";

export const canEditProduct = (permissions: string[]) => hasPermission(permissions, "PRODUCTS_EDIT");

/** Selling goes through the checkout, which needs "Record sales". */
export const canSellProduct = (permissions: string[]) => hasPermission(permissions, "SALES_CREATE");

export const canReserveProduct = (permissions: string[]) => hasPermission(permissions, "PRODUCTS_RESERVE");

/** Adding stock goes through "Receive stock". */
export const canRestockProduct = (permissions: string[]) => hasPermission(permissions, "STOCK_RECEIVE");

export const canDeactivateProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_DEACTIVATE");

export const canCreateProduct = (permissions: string[]) => hasPermission(permissions, "PRODUCTS_CREATE");

export const canReceiveStock = (permissions: string[]) => hasPermission(permissions, "STOCK_RECEIVE");
