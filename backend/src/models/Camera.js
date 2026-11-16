const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  streamUrl: { type: String, default: '' },
  streamType: { type: String, default: 'url' }, // 'youtube', 'webcam', 'url', 'rtsp', 'demo'
  modelType: { type: String, enum: ['csrnet', 'yolov8'], default: 'csrnet' },
  zoneId: { type: String, required: true },
  zoneName: { type: String, default: 'Zone 01' },
  resolution: { type: String, default: '1920x1080' },
  sampleFps: { type: Number, default: 2.0 },
  status: {
    type: String,
    enum: ['Pending', 'Live', 'Degraded', 'Offline'],
    default: 'Pending'
  },
  sceneType: {
    type: String,
    default: 'concourse'
  },
  lastCount: { type: Number, default: 0 },
  lastLatencyMs: { type: Number, default: 0 },
  lastActive: { type: Date },
  lastSnapshot: { type: String },
  snapshotUrl: { type: String },
  heatmapUrl: { type: String },
  coordinates: {
    lat: { type: Number, default: 19.0760 },
    lng: { type: Number, default: 72.8777 }
  }
});

module.exports = mongoose.model('Camera', cameraSchema);
