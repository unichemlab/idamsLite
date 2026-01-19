const express = require("express");
const router = express.Router();
const plantController = require("../controllers/plantController");
const authorize = require("../middleware/authorize");

router.get("/activity-logs",authorize(), plantController.getPlantActivityLogs);
router.get("/", plantController.getAllPlants);
router.post("/",authorize(), plantController.createPlant);
router.put("/:id",authorize(), plantController.updatePlant);
router.delete("/:id",authorize(), plantController.deletePlant);
router.post("/import",plantController.bulkImportPlants);
module.exports = router;
