const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', authMiddleware, zoneController.getZones);
router.put('/:id', authMiddleware, authorize(['admin', 'operator']), zoneController.updateZone);

module.exports = router;
