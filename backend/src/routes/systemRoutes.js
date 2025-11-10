const express = require("express");
const router = express.Router();
const systemController = require("../controllers/systemController");

// Create, Read, Update, Delete for systems
router.get("/", systemController.getAllSystems);
router.post("/", systemController.createSystem);
router.get("/:id", systemController.getSystemById);
router.put("/:id", systemController.updateSystem);
router.delete("/:id", systemController.deleteSystem);

module.exports = router;
