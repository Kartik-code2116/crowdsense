const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Detection = require('../models/Detection');

async function reset() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for data reset...');

  // Reset Zones - only 1 default demo zone
  await Zone.deleteMany({});
  await Zone.insertMany([
    {
      _id: 'zone-demo-01',
      name: 'Demo Safety Zone',
      code: 'DEMO-ZONE-01',
      floor: 'Level 1 Ground',
      maxCapacity: 200,
      warningThresholdPct: 70,
      criticalThresholdPct: 85,
      currentCount: 0,
      currentOccupancyPct: 0,
      evacuationRoutes: ['Main Egress Gate A', 'Emergency Stairwell North'],
      description: 'Default demonstration safety sector. Configure live stream URL or webcam to initiate continuous crowd scanning.',
      streamUrl: '/samples/mall_concourse.jpg',
      streamType: 'demo'
    }
  ]);
  console.log('✓ Reset Zones: Single default demo zone configured.');

  // Reset Cameras
  await Camera.deleteMany({});
  await Camera.insertMany([
    {
      _id: 'CAM-01',
      name: 'Demo Zone Camera',
      zoneId: 'zone-demo-01',
      zoneName: 'DEMO-ZONE-01',
      streamUrl: '/samples/mall_concourse.jpg',
      resolution: '1920x1080',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'concourse',
      lastCount: 0,
      lastLatencyMs: 38
    }
  ]);
  console.log('✓ Reset Cameras: Single default camera configured for Demo Zone.');

  // Reset Incidents
  await Incident.deleteMany({});
  console.log('✓ Cleared all old mock incidents (Active Incidents: 00 · All Clear)');

  // Reset Alerts
  await Alert.deleteMany({});
  await Alert.create({
    title: 'Safety System Online',
    message: 'All monitored venue sectors operating within safe capacity limits.',
    level: 'Info',
    zoneId: 'zone-demo-01',
    zoneName: 'Demo Safety Zone',
    cameraId: 'CAM-01',
    count: 0,
    capacity: 200,
    occupancyPct: 0,
    status: 'Resolved',
    createdAt: new Date()
  });
  console.log('✓ Reset Alerts (1 info alert, 0 critical alerts)');

  // Reset Detections with real low-count baseline
  await Detection.deleteMany({});
  await Detection.create({
    cameraId: 'CAM-01',
    zoneId: 'zone-demo-01',
    count: 0,
    peakDensity: 0.0,
    latencyMs: 38,
    modelUsed: 'YOLOv8n-Detection',
    flowVector: { speed: 0.0, headingDeg: 0, direction: 'None' }
  });
  console.log('✓ Reset Detections to real YOLOv8 baseline');

  await mongoose.disconnect();
  console.log('✅ MongoDB successfully synchronized with real single-demo baseline!');
}

reset().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
