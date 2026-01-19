const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {bulkImportServerInventory,bulkImportSystemInventory} = require('../controllers/bulkImportController');

// System Inventory Bulk Import
// router.post('/system-inventory/bulk-import', authenticateToken, bulkImportSystemInventory);

// Server Inventory Bulk Import
// router.post('/server-inventory/bulk-import', authenticateToken, bulkImportServerInventory);

module.exports = router;