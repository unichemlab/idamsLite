/**
 * shared/abilities.js
 * Define CASL permissions based on user roles and permissions
 */

const { AbilityBuilder, Ability } = require('@casl/ability');

/**
 * Define abilities for a user based on their role and permissions
 * @param {Object} user - User object from JWT token
 * @returns {Ability} CASL Ability instance
 */
function defineAbilitiesFor(user) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  if (!user) return build(); // Guest user has no permissions

  // -----------------------------------------------------------
  // ROLE MAPPING (update based on DB)
  // -----------------------------------------------------------
  const ROLES = {
    SUPER_ADMIN: 1,
    IT_ADMIN: 2,
    PLANT_ADMIN: 3,
    IT_BIN_ADMIN: 12,
    MANAGER: 4,
    APPROVER: 5,
    USER: 6
  };

  // Normalize role_ids
  const userRoles = Array.isArray(user.role_id) ? user.role_id : [user.role_id];

  // Helpers
  const hasRole = (id) => userRoles.includes(id);
  const hasAnyRole = (...roles) => roles.some((r) => userRoles.includes(r));

  // -----------------------------------------------------------
  // SUPER ADMIN → Full Access
  // -----------------------------------------------------------
  if (hasRole(ROLES.SUPER_ADMIN)) {
    can('manage', 'all');
    return build();
  }

  // -----------------------------------------------------------
  // IT ADMIN
  // -----------------------------------------------------------
  if (hasRole(ROLES.IT_ADMIN)) {
    can('manage', 'Task');
    can('manage', 'User');
    can('manage', 'TaskClosure');

    can('view', 'AllTasks');
    can('create', 'Task');
    can('update', 'Task');
    can('delete', 'Task');
    can('assign', 'Task');
    can('close', 'Task');
    can('view', 'Reports');
  }

  // -----------------------------------------------------------
  // IT BIN ADMIN (Plant-based permissions)
  // -----------------------------------------------------------
  if (hasRole(ROLES.IT_BIN_ADMIN)) {
    const allowedPlantIds = user?.itPlants?.map((p) => p.plant_id) || null;

    const isAllowedPlant = (task) => {
      if (!allowedPlantIds) return true;
      return allowedPlantIds.includes(task.plant_id);
    };

    can('view', 'Task', isAllowedPlant);
    can('update', 'Task', isAllowedPlant);
    can('assign', 'Task', isAllowedPlant);

    can('close', 'Task');
    can('create', 'TaskClosure');
    can('update', 'TaskClosure');
  }

  // -----------------------------------------------------------
  // PLANT ADMIN
  // -----------------------------------------------------------
  if (hasRole(ROLES.PLANT_ADMIN)) {
    const location = user.location;

    can('view', 'Task', { location });
    can('create', 'Task', { location });
    can('update', 'Task', { location });
    can('approve', 'Task', { location });
  }

  // -----------------------------------------------------------
  // MANAGER
  // -----------------------------------------------------------
  if (hasRole(ROLES.MANAGER)) {
    const dept = user.department;

    can('view', 'Task', { department: dept });
    can('create', 'Task');

    can('update', 'Task', (task) => task.department === dept);

    can('approve', 'Task', { reports_to: user.user_id });
  }

  // -----------------------------------------------------------
  // APPROVER
  // -----------------------------------------------------------
  if (hasRole(ROLES.APPROVER)) {
    can('view', 'Task', (task) =>
      task.approver1_status === 'Pending' ||
      task.approver2_status === 'Pending'
    );

    can('approve', 'Task');
    can('reject', 'Task');
  }

  // -----------------------------------------------------------
  // REGULAR USER
  // -----------------------------------------------------------
  if (hasRole(ROLES.USER)) {
    const uid = user.user_id;

    can('view', 'Task', { request_for_by: uid });
    can('create', 'UserRequest');
    can('view', 'UserRequest', { request_for_by: uid });
  }

  // -----------------------------------------------------------
  // COMMON PERMISSIONS FOR ALL LOGGED-IN USERS
  // -----------------------------------------------------------
  can('read', 'User', { id: user.user_id });
  can('update', 'User', { id: user.user_id });

  // Allowed to read masters
  ['PlantMaster', 'DepartmentMaster', 'RoleMaster', 'ApplicationMaster'].forEach((m) =>
    can('read', m)
  );

  // Build and return the final Ability object
  return build();
}

/**
 * Pack rules to send to frontend
 */
function packRules(ability) {
  return ability.rules;
}

/**
 * Unpack rules on frontend
 */
function unpackRules(rules) {
  return new Ability(rules);
}

/**
 * Quick permission check helper
 */
function canUser(user, action, subject, field) {
  return defineAbilitiesFor(user).can(action, subject, field);
}

module.exports = {
  defineAbilitiesFor,
  packRules,
  unpackRules,
  canUser
};
