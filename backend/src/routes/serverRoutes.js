const express = require("express");
const router = express.Router();
const serverController = require("../controllers/serverController");

// Get all servers
router.get("/", serverController.getAllServers);
// Get server by id
router.get("/:id", serverController.getServerById);
// Add server
router.post("/", serverController.addServer);
// Update server
router.put("/:id", serverController.updateServer);
// Delete server
router.delete("/:id", serverController.deleteServer);

module.exports = router;
