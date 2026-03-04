const express = require("express");
const router = express.Router();
const systemController = require("../controllers/systemController");
const  authorize  = require("../middleware/authorize");
router.get("/check-duplicate", systemController.checkSystemDuplicate);
// Create, Read, Update, Delete for systems
router.get("/:systemId/validate-inactivate", systemController.validateSystemInactivation);

router.get("/list", systemController.getSystemInventoryList);
router.get("/",authorize(), systemController.getAllSystems);
router.post("/",authorize(), systemController.createSystem);
router.get("/:id", systemController.getSystemById);
router.put("/:id",authorize(), systemController.updateSystem);
router.delete("/:id",authorize(), systemController.deleteSystem);
router.post("/import",systemController.bulkImportSystemInventory);
module.exports = router;
