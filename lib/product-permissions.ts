import { hasPermission, type Permission } from "@/lib/permissions";

export const canEditProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_EDIT");

export const canSellProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_SELL");

export const canReserveProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_RESERVE");

export const canRestockProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_RESTOCK");

export const canDeactivateProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_DEACTIVATE");

export const canCreateProduct = (permissions: string[]) =>
  hasPermission(permissions, "PRODUCTS_CREATE");

export const canReceiveStock = (permissions: string[]) =>
  hasPermission(permissions, "STOCK_RECEIVE");
