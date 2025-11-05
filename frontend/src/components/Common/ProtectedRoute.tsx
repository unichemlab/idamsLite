import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {useAbility} from "../../context/AbilityContext";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  requiredRole,
}) => {
  const { user } = useAuth();
  const { can } = useAbility();
  const location = useLocation();

  // Store the attempted URL for post-login redirect
  const redirectPath = location.pathname + location.search;

  // Ensure we have clean routing state when not logged in
  if (!user || !user.id || user.status !== "ACTIVE") {
    // Clear any stale routing state
    localStorage.removeItem("from");
    localStorage.removeItem("returnTo");
    localStorage.removeItem("initialRoute");
    return <Navigate to="/" replace state={{ from: redirectPath }} />;
  }

  // Check permission-based access first
  if (permission && !can(permission)) {
    return <Navigate to="/access-denied" replace />;
  }

  // Check role-based access if specified
  if (requiredRole) {
    const hasRole = (roleId: number) => 
      Array.isArray(user.role_id) 
        ? user.role_id.includes(roleId)
        : user.role_id === roleId;

    const roleMatches = {
      SuperAdmin: hasRole(1),
      PlantITAdmin: hasRole(2),
      Approver: can("approve:requests") || hasRole(4),
      AuditReviewer: hasRole(3),
      PlantUser: hasRole(5),
    };

    if (
      !roleMatches[requiredRole as keyof typeof roleMatches] &&
      !roleMatches.SuperAdmin
    ) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Allow access
  return <>{children}</>;
};

export default ProtectedRoute;
