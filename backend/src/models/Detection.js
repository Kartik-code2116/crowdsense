const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
  userId: { type: String, index: true },
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

// Compound Indexes for User Scoping & Fast Time-Series Queries
detectionSchema.index({ userId: 1, timestamp: -1 });
detectionSchema.index({ userId: 1, cameraId: 1, timestamp: -1 });
detectionSchema.index({ userId: 1, zoneId: 1, timestamp: -1 });
detectionSchema.index({ timestamp: 1 });

module.exports = mongoose.model('Detection', detectionSchema);
