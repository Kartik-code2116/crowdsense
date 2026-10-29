const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  level: {
    type: String,
    enum: ['Critical', 'Warning', 'Info'],
    default: 'Warning'
  },
  zoneId: { type: String, required: true },
  zoneName: { type: String, required: true },
  cameraId: { type: String },
  count: { type: Number, required: true },
  capacity: { type: Number, required: true },
  occupancyPct: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Active', 'Acknowledged', 'Resolved'],
    default: 'Active'
  },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true }
});

alertSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
