# RBAC Permission System Documentation

## Overview

The RBAC (Role-Based Access Control) system uses a combination of roles and granular permissions to control access to different parts of the application. Permissions follow the format `action:subject` where:

- `action`: The type of operation (create, read, update, delete, approve, manage)
- `subject`: The resource or area being accessed (user-requests, tasks, reports, etc.)

## Permission Structure

### Actions

- `create`: Ability to create new resources
- `read`: Ability to view resources
- `update`: Ability to modify existing resources
- `delete`: Ability to remove resources
- `approve`: Ability to approve/reject requests
- `manage`: Full control over the resource (implies all other permissions)

### Subjects

Core application areas that can be controlled:

- `all`: Special subject that grants access to everything
- `user-requests`: Access request management
- `tasks`: Task closure tracking
- `reports`: Report generation and viewing
- `plant-users`: User management within a plant
- `activity-logs`: Audit trail access
- `roles`: Role management
- `departments`: Department configuration
- `applications`: Application master data
- `servers`: Server management
- `system`: System configuration
- `vendors`: Vendor management
- `plants`: Plant configuration

## Role Hierarchy

Roles are organized in a hierarchy (lowest to highest privilege):

1. PlantUser
2. AuditReviewer
3. Approver
4. PlantITAdmin
5. SuperAdmin

Each role inherits permissions from roles below it in the hierarchy.

## Default Role Permissions

### SuperAdmin

- Has `manage:all` which grants full system access

### PlantITAdmin

- Full access to plant-level user management
- Create/read/update user requests
- Read/update tasks
- Access reports
- Manage plant users

### Approver

- Read/approve user requests
- Read/update tasks

### PlantUser

- Create/read user requests
- Read tasks

### AuditReviewer

- Read-only access to user requests
- Read-only access to tasks
- Read-only access to reports
- Read-only access to activity logs

## Usage in Code

```typescript
// Check if user can perform an action
const canApprove = can('approve:user-requests');

// Protect a component
<CanAccess permission="create:user-requests">
  <CreateRequestButton />
</CanAccess>

// Protect a route
<ProtectedRoute
  path="/requests/new"
  permission="create:user-requests"
  component={CreateRequest}
/>
```

## Adding New Permissions

1. Add the new subject to the schema in `docs/rbac-permissions.json`
2. Update `frontend/src/shared/rbac/permissions.ts` with the new permission
3. Assign the permission to appropriate roles in `RolePermissions`
4. Update any relevant backend middleware

## Backend Integration

The permission system is enforced at multiple levels:

1. JWT token contains role and permission information
2. Backend middleware validates permissions on protected routes
3. Frontend components respect permissions for UI elements
4. Activity logging tracks all permission-gated actions
