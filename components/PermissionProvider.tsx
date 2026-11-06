"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  hasPermission,
  isOwnerRole,
  meetsRequirement,
  type Permission,
  type Requirement,
} from "@/lib/permissions";

export type Me = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  permissions: string[];
  mustChangePassword?: boolean;
  hasPin?: boolean;
  locale?: string;
};

type PermissionContextValue = {
  me: Me;
  permissions: string[];
  isOwner: boolean;
  can: (key: Permission) => boolean;
  canAny: (...keys: Permission[]) => boolean;
  meets: (requirement?: Requirement) => boolean;
  canSeeCost: boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export const PermissionProvider = ({
  me,
  children,
}: {
  me: Me;
  children: ReactNode;
}) => {
  const value = useMemo<PermissionContextValue>(() => {
    const can = (key: Permission) => hasPermission(me.permissions, key);
    return {
      me,
      permissions: me.permissions,
      isOwner: isOwnerRole(me.role),
      can,
      canAny: (...keys) => keys.some(can),
      meets: (requirement) => meetsRequirement(me.permissions, requirement),
      canSeeCost: can("REPORTS_VIEW_COST_PROFIT"),
    };
  }, [me]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const value = useContext(PermissionContext);
  if (!value) {
    throw new Error("usePermission must be used inside the app shell");
  }
  return value;
};
