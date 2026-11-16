const aiClient = require('../services/aiClient');
const Detection = require('../models/Detection');
const Zone = require('../models/Zone');
const { getIsConnected } = require('../config/db');

const emptyAnalytics = (range) => ({
  success: true, source: 'No recorded detections', totalSamples: 0, range,
  currentCount: null, peakPredicted: null, peakPredictedTime: null,
  trendPct: null, points: []
});

exports.getTrendAnalytics = async (req, res, next) => {
  const { range = 'Today', zoneId } = req.query;
  const userId = req.user.id;
  if (!getIsConnected()) return res.json(emptyAnalytics(range));

  try {
    const duration = range === 'Last hour' ? 60 * 60 * 1000 : range === '7 days' ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    const query = { userId, timestamp: { $gte: new Date(Date.now() - duration) } };
    if (zoneId) query.zoneId = zoneId;
    const detections = await Detection.find(query).sort({ timestamp: 1 }).lean();
    if (!detections.length) return res.json(emptyAnalytics(range));

    const buckets = new Map();
    for (const detection of detections) {
      const date = new Date(detection.timestamp);
      const key = `${date.toISOString().slice(0, 13)}:${date.getMinutes() < 30 ? '00' : '30'}`;
      const observedCount = Number(detection.zoneCount ?? detection.count) || 0;
      const bucket = buckets.get(key);
      // A camera writes a detection row each sample. Use the latest zone total
      // for the bucket instead of summing/averaging duplicate camera views.
      if (!bucket || new Date(detection.timestamp) > bucket.timestamp) {
        buckets.set(key, { count: observedCount, timestamp: new Date(detection.timestamp) });
      }
    }
    const points = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, bucket]) => ({
      time: time.slice(11), count: bucket.count, forecast: null
    }));
    const counts = points.map((point) => point.count);
    const currentCount = counts[counts.length - 1];
    const first = counts[0];
    const trendPct = first ? `${(((currentCount - first) / first) * 100 >= 0 ? '+' : '')}${(((currentCount - first) / first) * 100).toFixed(1)}%` : '0.0%';
    return res.json({ success: true, source: 'Recorded detections', totalSamples: detections.length, range, currentCount, peakPredicted: null, peakPredictedTime: null, trendPct, points });
  } catch (error) {
    next(error);
  }
};

exports.getZoneForecast = async (req, res, next) => {
  const { zoneId } = req.query;
  const userId = req.user.id;
  if (!zoneId) return res.status(400).json({ success: false, message: 'zoneId is required.' });
  if (!getIsConnected()) return res.status(503).json({ success: false, message: 'Forecasting needs persisted detection history.' });
  try {
    const zone = await Zone.findOne({ $or: [{ _id: zoneId }, { id: zoneId }], userId }).lean();
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found.' });
    const history = await Detection.find({ userId, zoneId, timestamp: { $gte: new Date(Date.now() - 48 * 60000) } }).sort({ timestamp: 1 }).select({ count: 1, zoneCount: 1, timestamp: 1, _id: 0 }).lean();
    const buckets = new Map();
    for (const item of history) {
      const bucket = Math.floor(new Date(item.timestamp).getTime() / 120000);
      const current = buckets.get(bucket);
      const count = Number(item.zoneCount ?? item.count) || 0;
      if (current === undefined || new Date(item.timestamp).getTime() > current.timestamp) {
        buckets.set(bucket, { count, timestamp: new Date(item.timestamp).getTime() });
      }
    }
    const counts = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, item]) => item.count);
    if (counts.length < 3) return res.status(200).json({ success: true, data: { available: false, message: 'At least three two-minute detection buckets are required for a trend baseline.', observations: counts.length } });
    const result = await aiClient.getForecast(zone.id || zone._id, counts, zone.maxCapacity, zone.warningThresholdPct, zone.criticalThresholdPct);
    return res.json({ success: true, data: { ...result, observations: counts.length } });
  } catch (error) {
    next(error);
  }
};
