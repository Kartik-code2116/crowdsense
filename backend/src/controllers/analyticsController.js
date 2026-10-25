const aiClient = require('../services/aiClient');
const Detection = require('../models/Detection');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getTrendAnalytics = async (req, res) => {
  const { range = 'Today', zoneId } = req.query;

  // Generate smooth time series
  const points = [
    { time: '09:00', count: 680, forecast: null },
    { time: '10:00', count: 820, forecast: null },
    { time: '11:00', count: 990, forecast: null },
    { time: '12:00', count: 1150, forecast: null },
    { time: '13:00', count: 1080, forecast: null },
    { time: '14:00', count: 1240, forecast: null },
    { time: '14:30', count: 1284, forecast: 1284 },
    { time: '15:00', count: null, forecast: 1390 },
    { time: '15:30', count: null, forecast: 1450 },
    { time: '16:00', count: null, forecast: 1310 }
  ];

  res.json({
    success: true,
    range,
    currentCount: 1284,
    peakPredicted: 1450,
    peakPredictedTime: '15:30',
    trendPct: '+8.2%',
    points
  });
};

exports.getZoneForecast = async (req, res) => {
  const { zoneId = 'z1', capacity = 250 } = req.query;
  const history = [120, 135, 142, 160, 178, 195, 210];
  const forecast = await aiClient.getForecast(zoneId, history, Number(capacity));
  res.json({ success: true, data: forecast });
};
