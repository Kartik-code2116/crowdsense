const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { getMemoryStore } = require('../config/db');

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    gateway: 'Node.js/Express',
    uptimeSeconds: Math.floor(process.uptime()),
    aiLatencyMs: 38,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

router.get('/models', authMiddleware, modelController.getModels);
router.post('/models/switch', authMiddleware, authorize(['admin']), modelController.setActiveModel);

router.get('/audit-logs', authMiddleware, authorize(['admin']), (req, res) => {
  const store = getMemoryStore();
  res.json({ success: true, count: store.auditLogs.length, data: store.auditLogs });
});

module.exports = router;
