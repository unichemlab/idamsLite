const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/', systemController.getAllSystems);
router.get('/:id', systemController.getSystemById);
router.put('/:id', systemController.updateSystem);

module.exports = router;
