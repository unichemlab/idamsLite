const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/rbac");
const authorize = require("../middleware/authorize");

// ROLES
router.get("/roles", authorize(), ctrl.getRoles);
router.post("/roles", authorize(), ctrl.createRole);
router.put("/roles/:id", authorize(), ctrl.updateRole);
router.delete("/roles/:id", authorize(), ctrl.deleteRole);

// PERMISSIONS
router.get("/permissions", authorize(), ctrl.getPermissions);
router.post("/permissions", authorize(), ctrl.createPermission);
router.delete("/permissions/:id", authorize(), ctrl.deletePermission);

// ROLE-PERMISSIONS
router.get("/role-permissions", authorize(), ctrl.getRolePermissions);
router.post("/role-permissions", authorize(), ctrl.assignRolePermission);
router.delete("/role-permissions/:id", authorize(), ctrl.removeRolePermission);

// USER PLANT PERMISSIONS
router.get("/user/:id/plant-permissions", authorize(), ctrl.getUserPlantPermissions);
router.post("/user/:id/plant-permissions", authorize(), ctrl.saveUserPlantPermissions);

// LOGGED-IN USER PERMISSIONS
router.get("/my-permissions", authorize(), ctrl.getMyPermissions);

module.exports = router;
