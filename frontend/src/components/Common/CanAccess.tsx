import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAbility } from "../../context/AbilityContext";
import { useAuth } from "../../context/AuthContext";

interface CanAccessProps {
  children: ReactNode;
  action: string;
  subject: string;
  redirectTo?: string;
}

/**
 * CASL-powered access control component. Use this to protect routes and components
 * based on user permissions.
 *
 * @example
 * // Protect an approver route
 * <CanAccess action="read" subject="ROLE_MASTER">
 *   <ApproverDashboard />
 * </CanAccess>
 */
const CanAccess: React.FC<CanAccessProps> = ({
  children,
  action,
  subject,
  redirectTo = "/",
}) => {
  const ability = useAbility();
  const { user } = useAuth();
  const location = useLocation();

  if (!user?.id) {
    // Not logged in → login page
    return <Navigate to="/" replace />;
  }

  if (!ability.can(action, subject)) {
    // No permission → redirect (default: home)
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default CanAccess;
