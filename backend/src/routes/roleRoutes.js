const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const authorize = require("../middleware/authorize");

router.get("/", roleController.getAllRoles);
// Activity logs for role master
router.get(
  "/activity-logs",
  authorize("read:roles"),
  roleController.getRoleActivityLogs
);
router.post("/", authorize("create:roles"), roleController.createRole);
router.put("/:id", authorize("update:roles"), roleController.updateRole);
router.delete("/:id", authorize("delete:roles"), roleController.deleteRole);
router.post("/import",authorize(),roleController.bulkImportPlants);
module.exports = router;
