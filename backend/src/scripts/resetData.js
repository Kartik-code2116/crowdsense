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

  // Reset Zones
  await Zone.deleteMany({});
  await Zone.insertMany([
    {
      _id: 'z1',
      name: 'North Entrance Gate',
      code: 'GATE-A-ZONE-01',
      floor: 'Level 1 Ground',
      maxCapacity: 200,
      warningThresholdPct: 70,
      criticalThresholdPct: 85,
      currentCount: 0,
      currentOccupancyPct: 0,
      evacuationRoutes: ['Exit A1', 'Emergency Stairwell North'],
      description: 'Main public turnstile entry terminal.'
    },
    {
      _id: 'z2',
      name: 'Central Concourse Atrium',
      code: 'HALL-ZONE-02',
      floor: 'Level 1 Main Atrium',
      maxCapacity: 315,
      warningThresholdPct: 75,
      criticalThresholdPct: 90,
      currentCount: 2,
      currentOccupancyPct: 1,
      evacuationRoutes: ['Main Concourse West Doors', 'East Egress Tunnel'],
      description: 'Primary high-density transit artery.'
    },
    {
      _id: 'z3',
      name: 'East Walkway Promenade',
      code: 'EAST-ZONE-03',
      floor: 'Level 1 Promenade',
      maxCapacity: 200,
      warningThresholdPct: 75,
      criticalThresholdPct: 90,
      currentCount: 0,
      currentOccupancyPct: 0,
      evacuationRoutes: ['East Turnstiles', 'Promenade Ramp B'],
      description: 'Pedestrian walkway leading to arena terraces.'
    },
    {
      _id: 'z4',
      name: 'Food Court & Dining Concourse',
      code: 'LOUNGE-ZONE-04',
      floor: 'Level 2 Mezzanine',
      maxCapacity: 300,
      warningThresholdPct: 75,
      criticalThresholdPct: 90,
      currentCount: 0,
      currentOccupancyPct: 0,
      evacuationRoutes: ['Stairwell South', 'Fire Elevator Bank'],
      description: 'Upper mezzanine hospitality and concession seating areas.'
    }
  ]);
  console.log('✓ Reset Zones to real counts (Total: 2, Avg Capacity: 1%)');

  // Reset Cameras
  await Camera.deleteMany({});
  await Camera.insertMany([
    {
      _id: 'CAM-01',
      name: 'North entrance gate',
      zoneId: 'z1',
      zoneName: 'North Entrance Gate',
      streamUrl: 'rtsp://edge.venue.lan/cam1',
      resolution: '1920x1080',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'entrance',
      lastCount: 0,
      lastLatencyMs: 34
    },
    {
      _id: 'CAM-02',
      name: 'Central concourse atrium',
      zoneId: 'z2',
      zoneName: 'Central Concourse Atrium',
      streamUrl: 'rtsp://edge.venue.lan/cam2',
      resolution: '2560x1440',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'concourse',
      lastCount: 2,
      lastLatencyMs: 223
    },
    {
      _id: 'CAM-03',
      name: 'East walkway promenade',
      zoneId: 'z3',
      zoneName: 'East Walkway Promenade',
      streamUrl: 'rtsp://edge.venue.lan/cam3',
      resolution: '1920x1080',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'walkway',
      lastCount: 0,
      lastLatencyMs: 34
    },
    {
      _id: 'CAM-04',
      name: 'Food court & dining hall',
      zoneId: 'z4',
      zoneName: 'Food Court & Dining Concourse',
      streamUrl: 'rtsp://edge.venue.lan/cam4',
      resolution: '1920x1080',
      sampleFps: 1.5,
      status: 'Live',
      sceneType: 'concourse',
      lastCount: 0,
      lastLatencyMs: 34
    },
    {
      _id: 'CAM-05',
      name: 'Gate B turnstiles',
      zoneId: 'z1',
      zoneName: 'North Entrance Gate',
      streamUrl: 'rtsp://edge.venue.lan/cam5',
      resolution: '1920x1080',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'entrance',
      lastCount: 0,
      lastLatencyMs: 34
    },
    {
      _id: 'CAM-06',
      name: 'Emergency egress corridor',
      zoneId: 'z2',
      zoneName: 'Central Concourse Atrium',
      streamUrl: 'rtsp://edge.venue.lan/cam6',
      resolution: '1920x1080',
      sampleFps: 1.0,
      status: 'Live',
      sceneType: 'walkway',
      lastCount: 0,
      lastLatencyMs: 34
    }
  ]);
  console.log('✓ Reset Cameras (CAM-02 = 2 people, others = 0)');

  // Reset Incidents
  await Incident.deleteMany({});
  console.log('✓ Cleared all old mock incidents (Active Incidents: 00 · All Clear)');

  // Reset Alerts
  await Alert.deleteMany({});
  await Alert.create({
    title: 'Safety System Online',
    message: 'All monitored venue sectors operating within safe capacity limits.',
    level: 'Info',
    zoneId: 'z2',
    zoneName: 'Central concourse',
    cameraId: 'CAM-02',
    count: 2,
    capacity: 315,
    occupancyPct: 1,
    status: 'Resolved',
    createdAt: new Date()
  });
  console.log('✓ Reset Alerts (1 info alert, 0 critical alerts)');

  // Reset Detections with real low-count baseline
  await Detection.deleteMany({});
  await Detection.create({
    cameraId: 'CAM-02',
    zoneId: 'z2',
    count: 2,
    peakDensity: 0.005,
    latencyMs: 223,
    modelUsed: 'YOLOv8n-Detection',
    flowVector: { speed: 1.0, headingDeg: 90, direction: 'East' }
  });
  console.log('✓ Reset Detections to real YOLOv8 baseline');

  await mongoose.disconnect();
  console.log('✅ MongoDB successfully synchronized with real AI monitoring baseline!');
}

reset().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
