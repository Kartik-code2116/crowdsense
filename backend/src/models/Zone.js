const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  floor: { type: String, default: 'Ground Level' },
  maxCapacity: { type: Number, required: true, default: 200 },
  warningThresholdPct: { type: Number, default: 75 },
  criticalThresholdPct: { type: Number, default: 90 },
  currentCount: { type: Number, default: 0 },
  currentOccupancyPct: { type: Number, default: 0 },
  evacuationRoutes: [{ type: String }],
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Zone', zoneSchema);
