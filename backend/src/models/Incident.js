const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentNumber: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  level: { type: String, enum: ['Critical', 'Warning', 'Resolved'], default: 'Warning' },
  location: { type: String, required: true },
  zoneId: { type: String, required: true },
  cameraId: { type: String },
  peakCount: { type: Number, default: 0 },
  capacity: { type: Number, default: 0 },
  time: { type: String },
  color: { type: String, default: 'amber' },
  snapshotBase64: { type: String },
  snapshotUrl: { type: String },
  heatmapUrl: { type: String },
  timelineEvents: [{
    timestamp: { type: Date, default: Date.now },
    description: { type: String },
    count: { type: Number }
  }],
  status: { type: String, enum: ['Open', 'Under Review', 'Resolved'], default: 'Open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', incidentSchema);
