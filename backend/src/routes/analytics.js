const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

router.get('/trend', authMiddleware, analyticsController.getTrendAnalytics);
router.get('/forecast', authMiddleware, analyticsController.getZoneForecast);

module.exports = router;
