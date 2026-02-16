const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const authorize = require("../middleware/authorize");

router.get("/activity-logs",authorize(), departmentController.getDepartmentActivityLogs);
router.get("/",authorize(), departmentController.getAllDepartments);
router.post("/",authorize(), departmentController.createDepartment);
router.put("/:id",authorize(), departmentController.updateDepartment);
router.delete("/:id",authorize(), departmentController.deleteDepartment);
router.post("/import",authorize(),departmentController.bulkImportDepartments);
module.exports = router;

