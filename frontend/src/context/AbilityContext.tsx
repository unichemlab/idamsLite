import React, { useEffect, useState, useContext, createContext } from "react";
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  RawRuleOf,
  Subject,
} from "@casl/ability";
import { useAuth } from "./AuthContext";

// NOTE: the `User` shape is provided by AuthContext; don't redefine an unused local type here.

export type Permission = string; // "action:subject" format e.g. "read:users"
export type AbilityAction = "manage" | "create" | "read" | "update" | "delete";
export type AbilitySubject =
  | "all"
  | "users"
  | "roles"
  | "workflows"
  | "tasks"
  | "approvals"
  | "reports"
  | "settings";

// Define the type for ability rules
type AppAbilityType = Ability<[AbilityAction, AbilitySubject | Subject]>;
type Rules = RawRuleOf<AppAbilityType>[];

// Initialize the Ability instance with proper typing
const AppAbility = Ability as AbilityClass<AppAbilityType>;

// Ability context interface
interface IAbilityContext {
  ability: AppAbilityType;
  // Accept either the newer single-string permission "action:subject" OR
  // the legacy two-argument form ability.can(action, subject)
  can: (
    permissionOrAction: Permission | AbilityAction,
    subject?: AbilitySubject | Subject
  ) => boolean;
  role: string;
  permissions: Permission[];
}

// Create the context with default values
export const AbilityContext = createContext<IAbilityContext>({
  ability: new AppAbility(),
  can: () => false,
  role: "PlantUser", // Default to lowest role
  permissions: [],
});

// Helper function to build permission rules
function buildRulesFromPermissions(permissions: Permission[] = []): Rules {
  const { can, rules } = new AbilityBuilder<AppAbilityType>(AppAbility);

  // Add super admin rule
  if (permissions.includes("manage:all")) {
    can("manage", "all");
  }

  // Add granular permissions
  permissions.forEach((permission) => {
    const [action, subject] = permission.split(":") as [AbilityAction, AbilitySubject];
    if (action && subject) {
      can(action, subject);
    }
  });

  return rules;
}

// Custom hook to use ability context
export const useAbility = () => {
  const context = useContext(AbilityContext);
  if (!context) {
    throw new Error("useAbility must be used within an AbilityProvider");
  }
  return context;
};

// Role hierarchy for determining highest role
const RoleHierarchy: Record<string, number> = {
  SuperAdmin: 5,
  PlantITAdmin: 4,
  Approver: 3,
  AuditReviewer: 2,
  PlantUser: 1,
};

// Role mapping from DB IDs to role names.
// NOTE: role IDs come from the backend and may differ between environments.
// Map them here to the canonical role names used in the frontend UI.
const RoleMap: Record<number, string> = {
  1: "SuperAdmin",
  2: "PlantITAdmin",
  3: "AuditReviewer",
  4: "Approver",
  5: "PlantUser",
};

function getHighestRole(roleIds: number | number[] | undefined): string {
  // Normalize to array so callers can pass a single number or an array
  const ids: number[] = Array.isArray(roleIds)
    ? roleIds
    : typeof roleIds === "number"
    ? [roleIds]
    : [];

  if (!ids.length) return "PlantUser";

  // Get role names and find highest priority
  const roleNames = ids.map((id) => RoleMap[id] || "").filter(Boolean);
  return roleNames.reduce((highest, current) => {
    const currentLevel = RoleHierarchy[current] ?? 0;
    const highestLevel = RoleHierarchy[highest] ?? 0;
    return currentLevel > highestLevel ? current : highest;
  }, "PlantUser"); // Default to lowest role if none match
}

// Ability Provider Component
export const AbilityProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [ability] = useState<AppAbilityType>(() => new AppAbility());
  const { user } = useAuth();
  const [role, setRole] = useState<string>("PlantUser");

  useEffect(() => {
    if (user) {
      // Get permissions from user token/context
      const permissions = user.permissions || [];
      const rules = buildRulesFromPermissions(permissions);
      ability.update(rules);

      // Determine highest role
      const highestRole = getHighestRole(user.role_id);
      setRole(highestRole);
    } else {
      ability.update([]); // Clear permissions when user logs out
      setRole("PlantUser");
    }
  }, [user, ability]);

  const contextValue = {
    ability,
    can: (permissionOrAction: Permission | AbilityAction, subject?: AbilitySubject | Subject) => {
      // single string form: "action:subject"
      if (typeof permissionOrAction === "string" && typeof subject === "undefined") {
        const permission = permissionOrAction as Permission;
        const [action, subj] = permission.split(":") as [AbilityAction, AbilitySubject];
        return ability.can(action, subj);
      }

      // two-argument legacy form: can(action, subject)
      if (typeof permissionOrAction === "string" && typeof subject !== "undefined") {
        return ability.can(permissionOrAction as AbilityAction, subject as AbilitySubject);
      }

      return false;
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

export default AbilityProvider;
