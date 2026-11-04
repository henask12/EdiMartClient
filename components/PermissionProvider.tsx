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
};

type PermissionContextValue = {
  me: Me;
  permissions: string[];
  isOwner: boolean;
  /** Does the signed-in person hold this permission? */
  can: (key: Permission) => boolean;
  /** Holds at least one of these. */
  canAny: (...keys: Permission[]) => boolean;
  /** Meets a page/button requirement (all of `all`, one of `any`). */
  meets: (requirement?: Requirement) => boolean;
  /** May see what products cost and how much profit sales make. */
  canSeeCost: boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

/** Fed by /auth/me (see Shell). One place answers "can this person do X?" for the whole app. */
export const PermissionProvider = ({ me, children }: { me: Me; children: ReactNode }) => {
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
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

/** `const { can } = usePermission(); can("SALES_CREATE")` */
export const usePermission = () => {
  const value = useContext(PermissionContext);
  if (!value) {
    throw new Error("usePermission must be used inside the app shell");
  }
  return value;
};
