const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
  cameraId: { type: String, required: true },
  zoneId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  count: { type: Number, required: true },
  uncertainty: { type: Number, default: 0 },
  peakDensity: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 35 },
  modelUsed: { type: String, default: 'CSRNet' },
  flowVector: {
    speed: { type: Number, default: 0 },
    headingDeg: { type: Number, default: 0 },
    direction: { type: String, default: 'East' }
  },
  alertTriggered: { type: Boolean, default: false },
  snapshotUrl: { type: String },
  snapshotBase64: { type: String },
  heatmapUrl: { type: String }
});

// Compound Index on (cameraId, timestamp) for rapid time-series range slicing
detectionSchema.index({ cameraId: 1, timestamp: -1 });

// Compound Index on (zoneId, timestamp) for zone trend aggregation
detectionSchema.index({ zoneId: 1, timestamp: -1 });

// Permanent Time-Series Index (No TTL expiration - preserved indefinitely in MongoDB)
detectionSchema.index({ timestamp: 1 });

module.exports = mongoose.model('Detection', detectionSchema);
