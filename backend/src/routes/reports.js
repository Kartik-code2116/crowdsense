const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.get('/summary', authMiddleware, reportController.getReportSummary);
router.get('/export-csv', authMiddleware, reportController.exportCSV);
router.get('/audit-logs', authMiddleware, reportController.getAuditLogs);

module.exports = router;
