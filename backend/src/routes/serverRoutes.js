const express = require("express");
const router = express.Router();
const serverController = require("../controllers/serverController");
const authorize = require("../middleware/authorize");

// Get all servers
router.get("/", authorize("read:servers"), serverController.getAllServers);
// Get server by id
router.get("/:id", authorize("read:servers"), serverController.getServerById);
// Add server
router.post("/", authorize("create:servers"), serverController.addServer);
// Update server
router.put("/:id", authorize("update:servers"), serverController.updateServer);
// Delete server
router.delete(
  "/:id",
  authorize("delete:servers"),
  serverController.deleteServer
);

module.exports = router;
