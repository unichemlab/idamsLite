// routes/networkRoutes.js
const router = require('express').Router();
const networkController = require('../controllers/networkController');
const authorize = require("../middleware/authorize");

router.get('/',authorize(), networkController.getAllNetworks);
router.get('/:id', networkController.getNetworkById);
router.post('/',authorize(), networkController.createNetwork);
router.put('/:id',authorize(), networkController.updateNetwork);
router.delete('/:id',authorize(), networkController.deleteNetwork);
router.post('/import',authorize(), networkController.bulkImportNetwork);

module.exports = router;