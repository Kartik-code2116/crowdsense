const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', authMiddleware, alertController.getAlerts);
router.get('/incidents', authMiddleware, alertController.getIncidents);
router.put('/incidents/:id/resolve', authMiddleware, authorize(['admin']), alertController.resolveIncident);

module.exports = router;
