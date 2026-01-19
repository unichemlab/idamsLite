const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");

router.get("/activity-logs", departmentController.getDepartmentActivityLogs);
router.get("/", departmentController.getAllDepartments);
router.post("/", departmentController.createDepartment);
router.put("/:id", departmentController.updateDepartment);
router.delete("/:id", departmentController.deleteDepartment);
router.post("/import",departmentController.bulkImportDepartments);
module.exports = router;

