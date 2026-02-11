const express = require("express");
const router = express.Router();
const systemController = require("../controllers/systemController");
const  authorize  = require("../middleware/authorize");
// Create, Read, Update, Delete for systems
router.get("/:systemId/validate-inactivate", systemController.validateSystemInactivation);

router.get("/list", systemController.getSystemInventoryList);
router.get("/",authorize(), systemController.getAllSystems);
router.post("/", systemController.createSystem);
router.get("/:id", systemController.getSystemById);
router.put("/:id", systemController.updateSystem);
router.delete("/:id", systemController.deleteSystem);
router.post("/import",systemController.bulkImportSystemInventory);
module.exports = router;
