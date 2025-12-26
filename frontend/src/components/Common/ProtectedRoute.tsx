// src/components/Common/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  plantId?: number;
  fallbackPath?: string;
  showUnauthorized?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  plantId,
  fallbackPath = '/login',
  showUnauthorized = false,
}) => {
  const { user, loading } = useAuth();
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  // Show loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check permissions if specified
  if (permission || permissions) {
    let hasAccess = false;

    if (permission) {
      hasAccess = hasPermission(permission, plantId);
    } else if (permissions && permissions.length > 0) {
      hasAccess = requireAll
        ? hasAllPermissions(permissions, plantId)
        : hasAnyPermission(permissions, plantId);
    }

    if (!hasAccess) {
      if (showUnauthorized) {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            padding: '20px',
            backgroundColor: '#f9fafb',
          }}>
            <div style={{
              textAlign: 'center',
              maxWidth: '500px',
              padding: '40px',
              backgroundColor: 'white',
              borderRadius: '10px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}>
              <h1 style={{ 
                fontSize: '72px', 
                margin: '0 0 20px 0', 
                color: '#dc2626',
                fontWeight: 'bold'
              }}>
                403
              </h1>
              <h2 style={{ 
                fontSize: '24px', 
                margin: '0 0 10px 0', 
                color: '#374151',
                fontWeight: '600'
              }}>
                Access Denied
              </h2>
              <p style={{ 
                fontSize: '16px', 
                color: '#6b7280', 
                marginBottom: '30px',
                lineHeight: '1.5'
              }}>
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </p>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#0b63ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0a56b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0b63ce'}
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;