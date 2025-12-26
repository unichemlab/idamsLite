// backend/middleware/permissionMiddleware.js

/**
 * Permission Validation Middleware
 * Validates user permissions for CRUD operations on plant-specific data
 */

/**
 * Check if user has a specific permission
 * @param {Object} user - User object from req.user
 * @param {string} permission - Permission string (e.g., 'create:application_master')
 * @param {number} plantId - Optional plant ID for plant-specific checks
 * @returns {boolean}
 */
const hasPermission = (user, permission, plantId = null) => {
  if (!user) return false;

  // Super admin has all permissions
  if (user.isSuperAdmin) return true;

  // Check global permissions
  const hasGlobalPermission = user.permissions?.includes(permission) || false;

  // If no plant-specific check needed, return global permission
  if (!plantId) return hasGlobalPermission;

  // Check plant-specific permissions
  if (user.plantPermissions && Array.isArray(user.plantPermissions)) {
    const plantPermission = user.plantPermissions.find(
      pp => pp.plantId === plantId
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
 * Check if user can access a specific plant
 * @param {Object} user - User object from req.user
 * @param {number} plantId - Plant ID to check
 * @returns {boolean}
 */
const canAccessPlant = (user, plantId) => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  // Check permitted plant IDs
  if (user.permittedPlantIds?.includes(plantId)) return true;

  // Check IT bin plants
  //if (user.isITBin && user.itPlantIds?.includes(plantId)) return true;

  return false;
};

/**
 * Middleware to check if user has required permission
 * @param {string} permission - Required permission (e.g., 'create:application_master')
 * @param {boolean} checkPlantInBody - If true, checks permission for plant_location_id in req.body
 * @param {boolean} checkPlantInParams - If true, checks permission for plant in existing record
 */
const requirePermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // For create/update operations, check plant in body
      if (options.checkPlantInBody && req.body.plant_location_id) {
        const plantId = parseInt(req.body.plant_location_id);
        
        if (!hasPermission(user, permission, plantId)) {
          return res.status(403).json({ 
            error: `You do not have permission to ${permission.split(':')[0]} records for this plant`,
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermission: permission,
            plantId
          });
        }
      }
      
      // For update/delete operations, check plant in existing record
      if (options.checkPlantInRecord && req.params.id) {
        const recordId = parseInt(req.params.id);
        
        // Fetch existing record to check plant_location_id
        const existingRecord = await options.fetchRecord(recordId);
        
        if (!existingRecord) {
          return res.status(404).json({ 
            error: 'Record not found',
            code: 'RECORD_NOT_FOUND'
          });
        }

        const plantId = existingRecord.plant_location_id;
        
        if (!hasPermission(user, permission, plantId)) {
          return res.status(403).json({ 
            error: `You do not have permission to ${permission.split(':')[0]} this record`,
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermission: permission,
            plantId
          });
        }
        
        // Attach existing record to request for later use
        req.existingRecord = existingRecord;
      }

      // For read operations, just check global permission
      if (!options.checkPlantInBody && !options.checkPlantInRecord) {
        if (!hasPermission(user, permission)) {
          return res.status(403).json({ 
            error: `You do not have permission: ${permission}`,
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermission: permission
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ 
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Filter query results based on user's plant access
 * @param {Array} records - Array of records to filter
 * @param {Object} user - User object
 * @returns {Array} - Filtered records
 */
const filterByPlantAccess = (records, user) => {
  if (!user) return [];
  if (user.isSuperAdmin) return records;

  return records.filter(record => {
    const plantId = record.plant_location_id || record.plantId || record.plant_id;
    if (!plantId) return true; // Include records without plant ID
    return canAccessPlant(user, plantId);
  });
};

/**
 * Middleware to filter GET results by plant access
 */
const filterResults = () => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      if (Array.isArray(data) && req.user) {
        // Filter array results
        const filtered = filterByPlantAccess(data, req.user);
        return originalJson(filtered);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Get accessible plant IDs for a user
 * @param {Object} user - User object
 * @returns {Array<number>} - Array of plant IDs user can access
 */
const getAccessiblePlantIds = (user) => {
  if (!user) return [];
  if (user.isSuperAdmin) return []; // Empty array means "all plants"

  const plantIds = new Set();

  // Add permitted plants
  if (user.permittedPlantIds) {
    user.permittedPlantIds.forEach(id => plantIds.add(id));
  }

  // Add IT bin plants
//   if (user.isITBin && user.itPlantIds) {
//     user.itPlantIds.forEach(id => plantIds.add(id));
//   }

  return Array.from(plantIds);
};

module.exports = {
  hasPermission,
  canAccessPlant,
  requirePermission,
  filterByPlantAccess,
  filterResults,
  getAccessiblePlantIds,
};