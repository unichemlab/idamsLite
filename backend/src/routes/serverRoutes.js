const express = require("express");
const router = express.Router();
const serverController = require("../controllers/serverController");
const authorize = require("../middleware/authorize");

// Get all servers
router.get("/", authorize("read:server_management"), serverController.getAllServers);
// Get server by id
router.get("/:id", authorize("read:server_management"), serverController.getServerById);
// Add server
router.post("/", authorize("create:server_management"), serverController.addServer);
// Update server
router.put("/:id", authorize("update:server_management"), serverController.updateServer);
// Delete server
router.delete(
  "/:id",
  authorize("delete:server_management"),
  serverController.deleteServer
);
router.post("/import",serverController.bulkImportServerInventory);


module.exports = router;
