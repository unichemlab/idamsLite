// routes/networkRoutes.js
const router = require('express').Router();
const networkController = require('../controllers/networkController');
const authorize = require("../middleware/authorize");

router.get('/',authorize(), networkController.getAllNetworks);
router.get('/:id', networkController.getNetworkById);
router.post('/', networkController.createNetwork);
router.put('/:id', networkController.updateNetwork);
router.delete('/:id', networkController.deleteNetwork);
router.post('/import', networkController.bulkImportNetwork);

module.exports = router;