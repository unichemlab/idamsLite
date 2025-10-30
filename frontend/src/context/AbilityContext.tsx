import React, { useEffect, useState } from "react";
import { createContext } from "react";
import { Ability, AbilityBuilder, AbilityClass } from "@casl/ability";

// Define the shape of a permission row returned by the backend
export type PermissionRow = {
  id?: number;
  transaction_id?: string;
  user_id?: number;
  plant_id?: number;
  module_id?: string;
  can_add?: boolean;
  can_edit?: boolean;
  can_view?: boolean;
  can_delete?: boolean;
  created_on?: string;
  updated_on?: string;
};

type Rules = any[];

const AppAbility = Ability as AbilityClass<Ability>;

export const AbilityContext = createContext(new AppAbility());

function buildRulesFromPermissions(permissions: PermissionRow[] = []): Rules {
  const { can, rules } = new AbilityBuilder(AppAbility);
  permissions.forEach((p) => {
    const subject = p.module_id || "all";
    if (p.can_view) can("read", subject);
    if (p.can_add) can("create", subject);
    if (p.can_edit) can("update", subject);
    if (p.can_delete) can("delete", subject);
    // You can add more granular rules here e.g., by plant_id
  });
  return rules;
}

export const AbilityProvider: React.FC<{
  permissions?: PermissionRow[];
  children?: React.ReactNode;
}> = ({ permissions = [], children }) => {
  const [ability] = useState(() => new AppAbility());

  useEffect(() => {
    const rules = buildRulesFromPermissions(permissions);
    ability.update(rules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(permissions)]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
};

export function useAbility() {
  const ctx = React.useContext(AbilityContext);
  if (!ctx)
    throw new Error("useAbility must be used within an AbilityProvider");
  return ctx;
}

export default AbilityProvider;
