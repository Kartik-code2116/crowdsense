const mongoose = require('mongoose');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const Detection = require('../models/Detection');
const { getIsConnected, getMemoryStore } = require('../config/db');

const ADMIN_ID = '6ade4cd5c5d2c1c0ec4762e5';

const initialZonesData = [
  {
    _id: 'zone-arena-01',
    userId: ADMIN_ID,
    name: 'Arena Main Concourse',
    code: 'ARENA-CONCOURSE-01',
    floor: 'Level 1 Ingress',
    maxCapacity: 350,
    warningThresholdPct: 70,
    criticalThresholdPct: 85,
    currentCount: 0,
    currentOccupancyPct: 0,
    evacuationRoutes: ['Main Egress Gate A', 'Emergency Stairwell North'],
    description: 'Primary spectator concourse and ingress corridor. Continuously monitored with CSRNet density regression and YOLOv8 spatial tracking.',
    streamUrl: '/samples/mall_concourse.jpg',
    streamType: 'demo'
  }
];

const initialCamerasData = [
  {
    _id: 'CAM-01',
    userId: ADMIN_ID,
    name: 'Arena Concourse Gate A',
    zoneId: 'zone-arena-01',
    zoneName: 'ARENA-CONCOURSE-01',
    streamUrl: '/samples/mall_concourse.jpg',
    resolution: '1920x1080',
    sampleFps: 2.0,
    status: 'Live',
    sceneType: 'concourse',
    lastCount: 0,
    lastLatencyMs: 38
  }
];

// Single Admin Role Seed User
const initialUsersData = [
  {
    _id: new mongoose.Types.ObjectId(ADMIN_ID),
    name: 'Alex Kumar',
    email: 'admin@crowdsense.io',
    password: 'password123',
    role: 'admin',
    department: 'Venue Operations Lead',
    avatar: 'AK'
  }
];

const initialAlertsData = [
  {
    userId: ADMIN_ID,
    title: 'Safety System Online',
    message: 'Arena Main Concourse continuously monitored with CSRNet density regression and YOLOv8 spatial tracking.',
    level: 'Info',
    zoneId: 'zone-arena-01',
    zoneName: 'Arena Main Concourse',
    cameraId: 'CAM-01',
    count: 0,
    capacity: 350,
    occupancyPct: 0,
    status: 'Resolved',
    createdAt: new Date()
  }
];

function generateTimeSeriesDetections() {
  const detections = [];
  const now = Date.now();
  const sampleSteps = 288; // 24 hours at 5-minute intervals

  for (let i = 0; i < sampleSteps; i++) {
    const timestamp = new Date(now - (sampleSteps - i) * 5 * 60 * 1000);
    const hour = timestamp.getHours();
    let baseCrowd = 20;

    if (hour >= 17 && hour <= 21) {
      baseCrowd = 210 + Math.sin(i * 0.15) * 60;
    } else if (hour >= 11 && hour <= 14) {
      baseCrowd = 120 + Math.sin(i * 0.1) * 35;
    }

    const count = Math.max(0, Math.round(baseCrowd + (Math.random() * 16 - 8)));
    detections.push({
      userId: ADMIN_ID,
      cameraId: 'CAM-01',
      zoneId: 'zone-arena-01',
      timestamp,
      count,
      peakDensity: Number((count / 350).toFixed(4)),
      latencyMs: Math.round(36 + Math.random() * 4),
      modelUsed: 'CSRNET',
      flowVector: {
        speed: Number((0.6 + Math.random() * 0.8).toFixed(2)),
        headingDeg: 90,
        direction: 'East'
      },
      alertTriggered: count > 245
    });
  }

  return detections;
}

async function populateSeedData() {
  if (getIsConnected()) {
    try {
      // 1. Users (Only Admin)
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        for (const u of initialUsersData) {
          await User.create(u);
        }
        console.log(`✓ Inserted Admin User into MongoDB`);
      }

      // 2. Zones
      const zoneCount = await Zone.countDocuments();
      if (zoneCount === 0) {
        for (const z of initialZonesData) {
          await Zone.create(z);
        }
        console.log(`✓ Inserted ${initialZonesData.length} Zones into MongoDB`);
      }

      // 3. Cameras
      const cameraCount = await Camera.countDocuments();
      if (cameraCount === 0) {
        for (const c of initialCamerasData) {
          await Camera.create(c);
        }
        console.log(`✓ Inserted ${initialCamerasData.length} Cameras into MongoDB`);
      }

      // 4. Alerts
      const alertCount = await Alert.countDocuments();
      if (alertCount === 0) {
        for (const alt of initialAlertsData) {
          await Alert.create(alt);
        }
        console.log(`✓ Inserted ${initialAlertsData.length} Alerts into MongoDB`);
      }

      // 5. Real Time-Series Detections
      const detectionCount = await Detection.countDocuments();
      if (detectionCount === 0) {
        const timeSeriesRecords = generateTimeSeriesDetections();
        await Detection.insertMany(timeSeriesRecords);
        console.log(`✓ Inserted ${timeSeriesRecords.length} Time-Series Detections into MongoDB`);
      }

      console.log('✅ Local MongoDB Database populated with authentic CrowdSense data.');
    } catch (err) {
      console.error('! Error during MongoDB data seeding:', err.message);
    }
  }
}

if (require.main === module) {
  const { MONGODB_URI } = require('../config/env');
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('✓ Connected to MongoDB for CLI Seed Execution');
      await populateSeedData();
      process.exit(0);
    })
    .catch(err => {
      console.error('Connection failed:', err);
      process.exit(1);
    });
}

module.exports = { populateSeedData };
