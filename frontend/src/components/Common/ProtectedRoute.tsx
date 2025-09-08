import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  // If user is not authenticated or not active, redirect to login
  if (!user || !user.id || user.status !== "ACTIVE") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
