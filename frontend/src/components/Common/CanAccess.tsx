// src/components/Common/CanAccess.tsx
import React from "react";
import { useAbility } from "../../context/AbilityContext";

type Props = {
  moduleName: string;
  action: "manage" | "create" | "read" | "update" | "delete";
  plantId?: number | string;
  children: React.ReactNode;
};

const CanAccess: React.FC<Props> = ({ moduleName, action, plantId, children }) => {
  const ability = useAbility();
  if (ability.hasPermission(moduleName, action, plantId)) {
    return <>{children}</>;
  }
  return null;
};

export default CanAccess;
