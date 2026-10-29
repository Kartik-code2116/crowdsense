const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  floor: { type: String, default: 'Ground Level' },
  maxCapacity: { type: Number, required: true, default: 200 },
  warningThresholdPct: { type: Number, default: 75 },
  criticalThresholdPct: { type: Number, default: 90 },
  currentCount: { type: Number, default: 0 },
  currentOccupancyPct: { type: Number, default: 0 },
  evacuationRoutes: [{ type: String }],
  description: { type: String },
  streamUrl: { type: String, default: '' },
  streamType: { type: String, default: 'url' }, // 'url', 'webcam', 'demo'
  lastSnapshot: { type: String },
  heatmapUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

zoneSchema.index({ userId: 1, code: 1 });

module.exports = mongoose.model('Zone', zoneSchema);
