const express = require("express");
const router = express.Router();
const plantController = require("../controllers/plantController");

router.get("/activity-logs", plantController.getPlantActivityLogs);
router.get("/", plantController.getAllPlants);
router.post("/", plantController.createPlant);
router.put("/:id", plantController.updatePlant);
router.delete("/:id", plantController.deletePlant);

module.exports = router;
