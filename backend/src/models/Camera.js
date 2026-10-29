const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  streamUrl: { type: String, default: 'mock://camera_feed_01' },
  zoneId: { type: String, required: true },
  zoneName: { type: String, default: 'Zone 01' },
  resolution: { type: String, default: '1920x1080' },
  sampleFps: { type: Number, default: 2.0 },
  status: {
    type: String,
    enum: ['Live', 'Degraded', 'Offline'],
    default: 'Live'
  },
  sceneType: {
    type: String,
    enum: ['entrance', 'concourse', 'walkway', 'gate', 'foodcourt'],
    default: 'concourse'
  },
  lastCount: { type: Number, default: 0 },
  lastLatencyMs: { type: Number, default: 38 },
  lastActive: { type: Date, default: Date.now },
  lastSnapshot: { type: String },
  snapshotUrl: { type: String },
  heatmapUrl: { type: String },
  coordinates: {
    lat: { type: Number, default: 19.0760 },
    lng: { type: Number, default: 72.8777 }
  }
});

module.exports = mongoose.model('Camera', cameraSchema);
