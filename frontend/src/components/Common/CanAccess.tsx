import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAbility } from "../../context/AbilityContext";
import { useAuth } from "../../context/AuthContext";

interface CanAccessProps {
  children: ReactNode;
  permission: string;
  redirectTo?: string;
  fallback?: ReactNode;
  // optional plant scope (or any other condition) to check scoped permissions
  plantId?: number | null;
}

/**
 * Permission-based access control component. Use this to protect routes and components
 * based on user permissions.
 *
 * @example
 * // Protect an approver route
 * <CanAccess permission="read:roles">
 *   <RoleMasterTable />
 * </CanAccess>
 *
 * // With custom fallback
 * <CanAccess
 *   permission="create:user-requests"
 *   fallback={<DisabledButton>Not Authorized</DisabledButton>}
 * >
 *   <CreateRequestButton />
 * </CanAccess>
 */
const CanAccess: React.FC<CanAccessProps> = ({
  children,
  permission,
  redirectTo = "/access-denied",
  fallback = null,
  plantId = null,
}) => {
  const { can } = useAbility();
  const { user } = useAuth();

  // Not logged in → login page
  if (!user?.id) {
    return <Navigate to="/" replace />;
  }

  // Check permission string format
  if (!permission.includes(":")) {
    console.error(
      'Invalid permission format. Expected "action:subject", got:',
      permission
    );
    return null;
  }

  // Check permission. If plantId is provided, pass it as a condition.
  let allowed = false;
  try {
    if (
      typeof permission === "string" &&
      typeof plantId !== "undefined" &&
      plantId !== null
    ) {
      // split permission to action/subject and call with meta
      const parts = permission.split(":");
      const action = parts[0];
      const subj = parts[1] as any;
      allowed = can(action as any, subj, { plantId });
    } else {
      allowed = can(permission);
    }
  } catch (e) {
    console.warn("CanAccess permission check failed:", e);
    allowed = false;
  }

  if (!allowed) {
    // If fallback is provided, show that instead of redirecting
    if (fallback !== null) {
      return <>{fallback}</>;
    }
    // Otherwise redirect to Access Denied
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default CanAccess;
