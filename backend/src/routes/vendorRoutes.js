const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");

router.get("/activity-logs", vendorController.getVendorActivityLogs);
router.get("/", vendorController.getAllVendors);
router.post("/", vendorController.createVendor);
router.put("/:id", vendorController.updateVendor);
router.delete("/:id", vendorController.deleteVendor);

module.exports = router;
