import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";

const isAuthenticated = () => {
  // You can change this logic to check for your actual auth token or flag
  return !!localStorage.getItem("token");
};

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
