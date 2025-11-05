const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const authorize = require("../middleware/authorize");

router.get("/", authorize("read:roles"), roleController.getAllRoles);
router.post("/", authorize("create:roles"), roleController.createRole);
router.put("/:id", authorize("update:roles"), roleController.updateRole);
router.delete("/:id", authorize("delete:roles"), roleController.deleteRole);

module.exports = router;
