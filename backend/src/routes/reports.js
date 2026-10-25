const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.get('/summary', authMiddleware, reportController.getReportSummary);
router.get('/export-csv', authMiddleware, reportController.exportCSV);

module.exports = router;
