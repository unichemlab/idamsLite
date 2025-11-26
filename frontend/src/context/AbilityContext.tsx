import React, { useEffect, useState, useContext, createContext } from "react";
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  RawRuleOf,
  Subject,
  subject as caslSubject,
} from "@casl/ability";
import { useAuth } from "./AuthContext";

export type Permission = string; // "action:subject"
export type AbilityAction = "manage" | "create" | "read" | "update" | "delete";

export type AbilitySubject =
  | "all"
  | "users"
  | "roles"
  | "workflows"
  | "tasks"
  | "approvals"
  | "reports"
  | "settings"
  | "plants"
  | "vendors"
  | "applications"
  | "departments"
  | "servers"
  | "systems"
  | "user_requests"
  | "activity";

// CASL type
type AppAbilityType = Ability<[AbilityAction, AbilitySubject | Subject]>;
type Rules = RawRuleOf<AppAbilityType>[];

const AppAbility = Ability as AbilityClass<AppAbilityType>;

// Context interface
interface IAbilityContext {
  ability: AppAbilityType;
  can: (
    permissionOrAction: Permission | AbilityAction,
    subject?: AbilitySubject | Subject,
    meta?: Record<string, any>
  ) => boolean;
  hasPermission: (
    moduleName: string,
    action: AbilityAction,
    plantId?: number | string
  ) => boolean;
  role: string;
  permissions: Permission[];
}

// Default Context
export const AbilityContext = createContext<IAbilityContext>({
  ability: new AppAbility(),
  can: () => false,
  hasPermission: () => false,
  role: "PlantUser",
  permissions: [],
});

// ------------------------------------------------------------
// BUILD RULES FROM STRING PERMISSIONS
// ------------------------------------------------------------

function buildRulesFromPermissions(permissions: Permission[] = []): Rules {
  const { can, rules } = new AbilityBuilder<AppAbilityType>(AppAbility);

  // super admin
  if (permissions.includes("manage:all")) {
    can("manage", "all");
  }

  permissions.forEach((permission) => {
    try {
      // JSON encoded structured permissions
      if (permission.trim().startsWith("{")) {
        const obj = JSON.parse(permission);
        if (obj.action && obj.subject) {
          can(obj.action, obj.subject, obj.conditions || {});
        }
        return;
      }

      const parts = permission.split(":");
      const action = parts[0] as AbilityAction;
      const subject = parts[1] as AbilitySubject;

      if (!action || !subject) return;

      if (parts[2]) {
        const plantId = Number(parts[2]);
        if (!Number.isNaN(plantId)) {
          can(action, subject, { plantId });
        } else {
          can(action, subject, { scope: parts[2] });
        }
      } else {
        can(action, subject);
      }
    } catch (e) {
      console.warn("Invalid permission entry:", permission, e);
    }
  });

  return rules;
}

// ------------------------------------------------------------
// ROLE MAPPINGS & HIERARCHY
// ------------------------------------------------------------

const RoleHierarchy: Record<string, number> = {
  SuperAdmin: 5,
  PlantITAdmin: 4,
  Approver: 3,
  AuditReviewer: 2,
  PlantUser: 1,
};

const RoleMap: Record<number, string> = {
  1: "SuperAdmin",
  2: "PlantITAdmin",
  3: "AuditReviewer",
  4: "Approver",
  5: "PlantUser",
};

function getHighestRole(roleIds: number | number[] | undefined): string {
  const ids = Array.isArray(roleIds) ? roleIds : roleIds ? [roleIds] : [];

  const roleNames = ids.map((id) => RoleMap[id]).filter(Boolean);

  return roleNames.reduce((highest, current) => {
    return RoleHierarchy[current] > RoleHierarchy[highest]
      ? current
      : highest;
  }, "PlantUser");
}

// ------------------------------------------------------------
// PROVIDER
// ------------------------------------------------------------

export const AbilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ability] = useState<AppAbilityType>(() => new AppAbility());
  const { user } = useAuth();
  const [role, setRole] = useState<string>("PlantUser");

  useEffect(() => {
    if (user) {
      const permissions = user.permissions || [];
      const rules = buildRulesFromPermissions(permissions);
      ability.update(rules);

      const highestRole = getHighestRole(user.role_id);
      setRole(highestRole);
    } else {
      ability.update([]);
      setRole("PlantUser");
    }
  }, [user, ability]);

  // ------------------------------------------------------------
  // CONTEXT VALUE
  // ------------------------------------------------------------

  const contextValue: IAbilityContext = {
    ability,

    // Unified can() wrapper
    can: (permOrAction, subject, meta) => {
      if (typeof permOrAction === "string" && !subject) {
        const parts = permOrAction.split(":");
        const action = parts[0] as AbilityAction;
        const subj = parts[1] as AbilitySubject;

        if (parts[2]) {
          const plantId = Number(parts[2]);
          return ability.can(action, caslSubject(subj, { plantId }));
        }

        return ability.can(action, subj);
      }

      if (meta && subject && typeof subject === "string") {
        return ability.can(permOrAction as AbilityAction, caslSubject(subject, meta));
      }

      return ability.can(permOrAction as AbilityAction, subject as any);
    },

    // NEW hasPermission() (clean version)
    hasPermission: (moduleName, action, plantId) => {
      if (plantId) {
        return ability.can(
          action,
          caslSubject(moduleName as AbilitySubject, { plantId })
        );
      }
      return ability.can(action, moduleName as AbilitySubject);
    },

    role,
    permissions: user?.permissions || [],
  };

  return (
    <AbilityContext.Provider value={contextValue}>
      {children}
    </AbilityContext.Provider>
  );
};

export const useAbility = () => useContext(AbilityContext);

export default AbilityProvider;
