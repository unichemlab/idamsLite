// src/utils/permissionUtils.ts

/**
 * Check if user has specific permission
 */
export const hasPermission = (user: any, permission: string, plantId?: number): boolean => {
  if (!user) return false;

  if (
    user.role_id === 1 ||
    (Array.isArray(user.role_id) && user.role_id.includes(1)) ||
    user.isSuperAdmin === true
  ) {
    return true;
  }

  // Check global permissions
  const hasGlobalPermission = user.permissions?.includes(permission) || false;

  // If no plant-specific check needed, return global permission
  if (!plantId) return hasGlobalPermission;

  // Check plant-specific permissions
  if (user.plantPermissions && Array.isArray(user.plantPermissions)) {
    const plantPermission = user.plantPermissions.find(
      (pp: any) => pp.plantId === plantId
    );

    if (plantPermission && plantPermission.actions) {
      // Extract action from permission string (e.g., 'create:application_master' -> 'create')
      const action = permission.split(':')[0];
      return plantPermission.actions[action] === true;
    }
  }

  return hasGlobalPermission;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (user: any, permissions: string[], plantId?: number): boolean => {
  return permissions.some(permission => hasPermission(user, permission, plantId));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (user: any, permissions: string[], plantId?: number): boolean => {
  return permissions.every(permission => hasPermission(user, permission, plantId));
};

/**
 * Check if user can access a specific plant
 */
export const canAccessPlant = (user: any, plantId: number): boolean => {
  if (!user) return false;
  
  if (
    user.role_id === 1 ||
    (Array.isArray(user.role_id) && user.role_id.includes(1)) ||
    user.isSuperAdmin === true
  ) {
    return true;
  }

  // Check permitted plant IDs
  if (user.permittedPlantIds?.includes(plantId)) return true;
console.log('User plant:', user.permittedPlantIds, 'Checking plantId:', plantId);
console.log('Access result:', user.permittedPlantIds?.includes(plantId));
  // Check IT bin plants
  //if (user.isITBin && user.itPlantIds?.includes(plantId)) return true;

  return false;
};

/**
 * Filter data based on user's plant permissions
 */
export const filterByPlantPermission = <T extends { plant_location_id?: number; plantId?: number; plant_id?: number }>(
  data: T[],
  user: any
): T[] => {
  if (!user) return [];
  if (
    user.role_id === 1 ||
    (Array.isArray(user.role_id) && user.role_id.includes(1)) ||
    user.isSuperAdmin === true
  ) {
    return data;
  }
   console.log('Filtering data based on plant permissions for user:', user);
   console.log('Original data:', data);
  return data.filter(item => {
    const plantId = item.plant_location_id || item.plantId || item.plant_id;
    console.log('Checking item with plantId:', plantId);
    if (!plantId) return true; // Include items without plant ID
    return canAccessPlant(user, plantId);
  });
};


export const filterByModulePlantPermission = <
  T extends { plant_location_id?: number; plant_id?: number; plantId?: number }
>(
  data: T[],
  user: any,
  moduleId: string
): T[] => {
  if (!user) return [];
 if (
    user.role_id === 1 ||
    (Array.isArray(user.role_id) && user.role_id.includes(1)) ||
    user.isSuperAdmin === true
  ) {
    return data;
  }

  const allowedPlantIds = new Set<number>();

  // 1️⃣ Collect plants allowed for THIS module
  if (Array.isArray(user.plantPermissions)) {
    user.plantPermissions
      .filter((pp: any) => pp.moduleId === moduleId)
      .forEach((pp: any) => allowedPlantIds.add(pp.plantId));
  }

  // 2️⃣ IT BIN override (optional – only if business allows)
  // if (user.isITBin && Array.isArray(user.itPlantIds)) {
  //   user.itPlantIds.forEach((id: number) => allowedPlantIds.add(id));
  // }

  // 3️⃣ Filter records
  return data.filter((item) => {
    const plantId =
      item.plant_location_id || item.plant_id || item.plantId;

    if (!plantId) return true;
    return allowedPlantIds.has(plantId);
  });
};




/**
 * Get user's accessible plant IDs
 */
export const getAccessiblePlantIds = (user: any): number[] => {
  if (!user) return [];
  if (user.isSuperAdmin) return []; // Super admin has access to all, return empty to indicate "all"

  const plantIds = new Set<number>();

  // Add permitted plants
  if (user.permittedPlantIds) {
    user.permittedPlantIds.forEach((id: number) => plantIds.add(id));
  }

  // Add IT bin plants
  if (user.isITBin && user.itPlantIds) {
    user.itPlantIds.forEach((id: number) => plantIds.add(id));
  }

  return Array.from(plantIds);
};

/**
 * Check if user can perform an action on a specific module
 */
export const canPerformAction = (
  user: any,
  module: string,
  action: 'create' | 'read' | 'update' | 'delete',
  plantId?: number
): boolean => {
  const permission = `${action}:${module}`;
  return hasPermission(user, permission, plantId);
};

/**
 * Get permission status for multiple actions on a module
 */
export const getModulePermissions = (
  user: any,
  module: string,
  plantId?: number
) => {
  return {
    canCreate: canPerformAction(user, module, 'create', plantId),
    canRead: canPerformAction(user, module, 'read', plantId),
    canUpdate: canPerformAction(user, module, 'update', plantId),
    canDelete: canPerformAction(user, module, 'delete', plantId),
  };
};

/**
 * Check if user is approver for specific approval type
 */
export const isApproverForType = (user: any, approvalType: string): boolean => {
  if (!user || !user.isApprover) return false;
  if (user.isSuperAdmin) return true;

  return user.approverTypes?.includes(approvalType) || false;
};

/**
 * Filter plants by user access
 */
export const filterPlantsByAccess = (plants: any[], user: any) => {
  if (!user) return [];
  if (user.isSuperAdmin) return plants;

  const accessiblePlantIds = getAccessiblePlantIds(user);
  if (accessiblePlantIds.length === 0) return plants; // Super admin case

  return plants.filter(plant => accessiblePlantIds.includes(plant.id));
};

/**
 * Filter departments by user's plant access
 */
export const filterDepartmentsByPlantAccess = (departments: any[], user: any) => {
  if (!user) return [];
  if (user.isSuperAdmin) return departments;

  const accessiblePlantIds = getAccessiblePlantIds(user);
  if (accessiblePlantIds.length === 0) return departments; // Super admin case

  return departments.filter(dept => {
    const plantId = dept.plant_location_id || dept.plantId || dept.plant_id;
    return plantId ? accessiblePlantIds.includes(plantId) : true;
  });
};