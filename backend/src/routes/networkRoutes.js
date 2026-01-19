// routes/networkRoutes.js
const router = require('express').Router();
const networkController = require('../controllers/networkController');

router.get('/', networkController.getAllNetworks);
router.get('/:id', networkController.getNetworkById);
router.post('/', networkController.createNetwork);
router.put('/:id', networkController.updateNetwork);
router.delete('/:id', networkController.deleteNetwork);
router.post('/import', networkController.bulkImportNetwork);

module.exports = router;