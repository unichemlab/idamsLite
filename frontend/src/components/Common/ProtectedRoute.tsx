import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Not logged in or inactive → redirect to login
  if (!user || !user.id || user.status !== "ACTIVE") {
    return <Navigate to="/" replace />;
  }

  // Allow all users to access user-access-management
  if (location.pathname.startsWith("/user-access-management")) {
    return <>{children}</>;
  }

  // Restrict all other routes (considered admin panel) for user role_id = 12
  if (user.role_id == 12) {
    return <Navigate to="/user-access-management" replace />;
  }

  // Allow access for other roles
  return <>{children}</>;
};

export default ProtectedRoute;
