import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAbility } from "../../context/AbilityContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requires?: { action: string; subject: string };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requires,
}) => {
  const { user } = useAuth();
  const ability = useAbility();
  const location = useLocation();

  // Not logged in or inactive → redirect to login
  if (!user || !user.id || user.status !== "ACTIVE") {
    return <Navigate to="/" replace />;
  }

  // Check CASL permission if specified
  if (requires && !ability.can(requires.action, requires.subject)) {
    // No permission → redirect to home or access denied
    return <Navigate to="/" replace />;
  }

  // Allow access
  return <>{children}</>;
};

export default ProtectedRoute;
