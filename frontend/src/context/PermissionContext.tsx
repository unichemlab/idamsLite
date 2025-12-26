import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";

/* ================= TYPES ================= */

type ActionKey = "create" | "read" | "update" | "delete";

interface PlantPermission {
  moduleId: string;
  plantId: number;
  actions: Partial<Record<ActionKey, boolean>>;
}

interface PermissionContextType {
  hasPermission: (permission: string, plantId?: number) => boolean;
  hasAnyPermission: (permissions: string[], plantId?: number) => boolean;
  hasAllPermissions: (permissions: string[], plantId?: number) => boolean;
  canAccessPlant: (plantId: number) => boolean;
  isApprover: boolean;
  isSuperAdmin: boolean;
  isITBin: boolean;
  itPlantIds: number[];
  permittedPlantIds: number[];
}

/* ================= CONTEXT ================= */

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

/* ================= PROVIDER ================= */

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  /* 🔥 SUPER ADMIN CHECK (ONCE) */
 const isSuperAdmin = Boolean(
  user &&
    (user.role_id === 1 ||
      (Array.isArray(user.role_id) && user.role_id.includes(1)))
);

  /* ================= PERMISSION ================= */

  const hasPermission = useMemo(() => {
    return (permission: string, plantId?: number): boolean => {
      if (!user) return false;

      if (isSuperAdmin) return true;

      /* 🌍 GLOBAL PERMISSION */
      const hasGlobalPermission =
        Array.isArray(user.permissions) &&
        user.permissions.includes(permission);

      if (!plantId) return hasGlobalPermission;

      /* 🌱 PLANT-WISE PERMISSION */
      if (Array.isArray(user.plantPermissions)) {
        const plantPermission = user.plantPermissions.find(
          (pp: PlantPermission) => pp.plantId === plantId
        );

        if (!plantPermission?.actions) return hasGlobalPermission;

        const action = permission.split(":")[0];

        if (
          action === "create" ||
          action === "read" ||
          action === "update" ||
          action === "delete"
        ) {
          return plantPermission.actions[action] === true;
        }
      }

      return hasGlobalPermission;
    };
  }, [user, isSuperAdmin]);

  /* ================= ANY / ALL ================= */

  const hasAnyPermission = useMemo(() => {
    return (permissions: string[], plantId?: number): boolean =>
      permissions.some((p) => hasPermission(p, plantId));
  }, [hasPermission]);

  const hasAllPermissions = useMemo(() => {
    return (permissions: string[], plantId?: number): boolean =>
      permissions.every((p) => hasPermission(p, plantId));
  }, [hasPermission]);

  /* ================= PLANT ACCESS ================= */

  const canAccessPlant = useMemo(() => {
    return (plantId: number): boolean => {
      if (!user) return false;

      if (isSuperAdmin) return true;

      if (user.permittedPlantIds?.includes(plantId)) return true;

      if (user.isITBin && user.itPlantIds?.includes(plantId)) return true;

      return false;
    };
  }, [user, isSuperAdmin]);

  /* ================= CONTEXT VALUE ================= */

  const value: PermissionContextType = useMemo(
    () => ({
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessPlant,
      isApprover: Boolean(user?.isApprover),
      isSuperAdmin,
      isITBin: Boolean(user?.isITBin),
      itPlantIds: user?.itPlantIds ?? [],
      permittedPlantIds: user?.permittedPlantIds ?? [],
    }),
    [
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessPlant,
      user,
      isSuperAdmin,
    ]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

/* ================= HOOK ================= */

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error(
      "usePermissions must be used within a PermissionProvider"
    );
  }
  return context;
};
