const express = require("express");
const router = express.Router();
const serverController = require("../controllers/serverController");
const authorize = require("../middleware/authorize");

// Get all servers
router.get("/", authorize("read:server_inventory"), serverController.getAllServers);
// Get server by id
router.get("/:id", authorize("read:server_inventory"), serverController.getServerById);
// Add server
router.post("/", authorize("create:server_inventory"), serverController.addServer);
// Update server
router.put("/:id", authorize("update:server_inventory"), serverController.updateServer);
// Delete server
router.delete(
  "/:id",
  authorize("delete:server_inventory"),
  serverController.deleteServer
);

module.exports = router;
