// src/components/Common/PermissionComponents.tsx
import React, { ReactNode, memo } from 'react';
import { usePermissions } from '../../context/PermissionContext';

// ============================================
// 1. PermissionGuard - Conditionally render children
// ============================================
interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  plantId?: number;
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGuard = memo<PermissionGuardProps>(({
  permission,
  permissions,
  requireAll = false,
  plantId,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission, plantId);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions, plantId)
      : hasAnyPermission(permissions, plantId);
  } else {
    // If no permission specified, show children
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
});

PermissionGuard.displayName = 'PermissionGuard';

// ============================================
// 2. PlantGuard - Check plant access
// ============================================
interface PlantGuardProps {
  plantId: number;
  fallback?: ReactNode;
  children: ReactNode;
}

export const PlantGuard = memo<PlantGuardProps>(({
  plantId,
  fallback = null,
  children,
}) => {
  const { canAccessPlant } = usePermissions();

  return canAccessPlant(plantId) ? <>{children}</> : <>{fallback}</>;
});

PlantGuard.displayName = 'PlantGuard';

// ============================================
// 3. PermissionButton - Button with permission check
// ============================================
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  plantId?: number;
  children: ReactNode;
}

export const PermissionButton = memo<PermissionButtonProps>(({
  permission,
  permissions,
  requireAll = false,
  plantId,
  children,
  disabled,
  ...buttonProps
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission, plantId);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions, plantId)
      : hasAnyPermission(permissions, plantId);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) return null;

  return (
    <button {...buttonProps} disabled={disabled}>
      {children}
    </button>
  );
});

PermissionButton.displayName = 'PermissionButton';

// ============================================
// 4. RoleGuard - Check for specific roles
// ============================================
interface RoleGuardProps {
  roles: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export const RoleGuard = memo<RoleGuardProps>(({
  roles,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { isApprover, isSuperAdmin, isITBin } = usePermissions();

  const userRoles: Record<string, boolean> = {
    approver: isApprover,
    superadmin: isSuperAdmin,
    itbin: isITBin,
  };

  const hasRole = (role: string): boolean => {
    return userRoles[role.toLowerCase()] || false;
  };

  const hasAccess = requireAll
    ? roles.every(hasRole)
    : roles.some(hasRole);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
});

RoleGuard.displayName = 'RoleGuard';

// ============================================
// 5. PermissionLink - Link with permission check
// ============================================
interface PermissionLinkProps extends React.HTMLAttributes<HTMLSpanElement> {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  plantId?: number;
  children: ReactNode;
}

export const PermissionLink = memo<PermissionLinkProps>(({
  permission,
  permissions,
  requireAll = false,
  plantId,
  children,
  ...linkProps
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission, plantId);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions, plantId)
      : hasAnyPermission(permissions, plantId);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) return null;

  return <span {...linkProps}>{children}</span>;
});

PermissionLink.displayName = 'PermissionLink';

// ============================================
// 6. withPermission - HOC for components
// ============================================
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string,
  plantId?: number
) {
  const WithPermissionComponent = (props: P) => {
    const { hasPermission } = usePermissions();

    if (!hasPermission(requiredPermission, plantId)) {
      return null;
    }

    return <Component {...props} />;
  };

  WithPermissionComponent.displayName = `withPermission(${Component.displayName || Component.name || 'Component'})`;

  return memo(WithPermissionComponent);
}