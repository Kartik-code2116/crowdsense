const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', authMiddleware, zoneController.getZones);
router.post('/', authMiddleware, authorize(['admin', 'operator']), zoneController.createZone);
router.put('/:id', authMiddleware, authorize(['admin', 'operator']), zoneController.updateZone);
router.delete('/:id', authMiddleware, authorize(['admin', 'operator']), zoneController.deleteZone);

module.exports = router;
