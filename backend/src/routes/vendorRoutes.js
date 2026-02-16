const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const authorize = require("../middleware/authorize");

router.get("/activity-logs",authorize(), vendorController.getVendorActivityLogs);
router.get("/",authorize(), vendorController.getAllVendors);
router.post("/",authorize(), vendorController.createVendor);
router.put("/:id",authorize(), vendorController.updateVendor);
router.delete("/:id",authorize(), vendorController.deleteVendor);
router.post("/import",authorize(),vendorController.bulkImportVendors);
module.exports = router;
