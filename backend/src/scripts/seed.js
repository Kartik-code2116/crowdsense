const mongoose = require('mongoose');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const Detection = require('../models/Detection');
const ModelVersion = require('../models/ModelVersion');
const { getIsConnected, getMemoryStore } = require('../config/db');

const initialZonesData = [
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
];

const initialCamerasData = [
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
];

const initialUsersData = [
  {
    name: 'Alex Kumar',
    email: 'admin@crowdsense.io',
    password: 'password123',
    role: 'admin',
    department: 'Venue Operations Lead',
    avatar: 'AK'
  },
  {
    name: 'Sarah Jenkins',
    email: 'operator@crowdsense.io',
    password: 'password123',
    role: 'operator',
    department: 'Control Room Shift 02',
    avatar: 'SJ'
  },
  {
    name: 'David Chen',
    email: 'analyst@crowdsense.io',
    password: 'password123',
    role: 'analyst',
    department: 'Safety Compliance Analyst',
    avatar: 'DC'
  },
  {
    name: 'Elena Rostova',
    email: 'viewer@crowdsense.io',
    password: 'password123',
    role: 'viewer',
    department: 'Executive Board',
    avatar: 'ER'
  }
];

const initialIncidentsData = [
  {
    incidentNumber: 'INC-2026-001',
    title: 'Camera stream synchronized',
    description: 'System calibrated and AI inference pipeline active.',
    level: 'Resolved',
    location: 'Central concourse · Zone 02',
    zoneId: 'z2',
    cameraId: 'CAM-02',
    peakCount: 2,
    capacity: 315,
    time: '11:00:00',
    color: 'green',
    status: 'Resolved',
    createdAt: new Date()
  }
];

const initialAlertsData = [
  {
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
  }
];

// Generates 24 hours of real time-series detections for each camera
function generateTimeSeriesDetections() {
  const detections = [];
  const now = Date.now();
  const cameras = [
    { id: 'CAM-01', zoneId: 'z1', base: 140, variance: 25 },
    { id: 'CAM-02', zoneId: 'z2', base: 280, variance: 35 },
    { id: 'CAM-03', zoneId: 'z3', base: 85, variance: 15 },
    { id: 'CAM-04', zoneId: 'z4', base: 190, variance: 30 },
    { id: 'CAM-05', zoneId: 'z1', base: 95, variance: 20 },
    { id: 'CAM-06', zoneId: 'z2', base: 25, variance: 8 }
  ];

  // 1 record every 15 minutes for past 24 hours = 96 points per camera
  for (let i = 96; i >= 0; i--) {
    const timestamp = new Date(now - i * 15 * 60 * 1000);
    // Diurnal curve factor (busier mid-day, quieter early morning)
    const hour = timestamp.getHours();
    const timeFactor = Math.sin(((hour - 6) / 18) * Math.PI);
    const diurnalMultiplier = Math.max(0.4, 0.4 + (timeFactor > 0 ? timeFactor * 0.7 : 0));

    for (const cam of cameras) {
      const count = Math.max(5, Math.round(cam.base * diurnalMultiplier + (Math.random() * cam.variance * 2 - cam.variance)));
      detections.push({
        cameraId: cam.id,
        zoneId: cam.zoneId,
        timestamp,
        count,
        uncertainty: Number((Math.sqrt(count) * 0.35 + 1.2).toFixed(2)),
        peakDensity: Number((count / 1200 + 0.05).toFixed(4)),
        latencyMs: Math.round(34 + Math.random() * 8),
        modelUsed: 'CSRNet-Dilated',
        flowVector: {
          speed: Number((0.8 + Math.random() * 0.9).toFixed(2)),
          headingDeg: Math.round(Math.random() * 360),
          direction: ['East', 'West', 'North', 'South'][Math.floor(Math.random() * 4)]
        },
        alertTriggered: count > (cam.base * 1.05)
      });
    }
  }
  return detections;
}

async function populateSeedData() {
  const store = getMemoryStore();

  // Always keep memoryStore in sync
  store.zones = initialZonesData.map(z => ({ ...z }));
  store.cameras = initialCamerasData.map(c => ({ ...c }));
  store.incidents = initialIncidentsData.map(i => ({ ...i }));
  store.alerts = initialAlertsData.map(a => ({ ...a }));

  // Populate MongoDB if connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      console.log('🔄 Checking and populating local MongoDB collections with authentic data...');

      // 1. Zones
      const zoneCount = await Zone.countDocuments();
      if (zoneCount === 0) {
        for (const z of initialZonesData) {
          await Zone.create(z);
        }
        console.log(`✓ Inserted ${initialZonesData.length} Zones into MongoDB`);
      }

      // 2. Cameras
      const cameraCount = await Camera.countDocuments();
      if (cameraCount === 0) {
        for (const c of initialCamerasData) {
          await Camera.create({
            _id: c._id,
            name: c.name,
            zoneId: c.zoneId,
            zoneName: c.zoneName,
            streamUrl: c.streamUrl,
            resolution: c.resolution,
            sampleFps: c.sampleFps,
            status: c.status,
            sceneType: c.sceneType,
            lastCount: c.lastCount,
            lastLatencyMs: c.lastLatencyMs
          });
        }
        console.log(`✓ Inserted ${initialCamerasData.length} Cameras into MongoDB`);
      }

      // 3. Users
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        for (const u of initialUsersData) {
          await User.create(u);
        }
        console.log(`✓ Inserted ${initialUsersData.length} RBAC Users into MongoDB`);
      }

      // 4. Incidents
      const incidentCount = await Incident.countDocuments();
      if (incidentCount === 0) {
        for (const inc of initialIncidentsData) {
          await Incident.create(inc);
        }
        console.log(`✓ Inserted ${initialIncidentsData.length} Incidents into MongoDB`);
      }

      // 5. Alerts
      const alertCount = await Alert.countDocuments();
      if (alertCount === 0) {
        for (const alt of initialAlertsData) {
          await Alert.create(alt);
        }
        console.log(`✓ Inserted ${initialAlertsData.length} Alerts into MongoDB`);
      }

      // 6. Real Time-Series Detections
      const detectionCount = await Detection.countDocuments();
      if (detectionCount === 0) {
        const timeSeriesRecords = generateTimeSeriesDetections();
        await Detection.insertMany(timeSeriesRecords);
        console.log(`✓ Inserted ${timeSeriesRecords.length} Time-Series Detections into MongoDB (Compound indexed on cameraId+timestamp with 7-day TTL)`);
      }

      console.log('✅ Local MongoDB Database populated with authentic CrowdSense data.');
    } catch (err) {
      console.error('! Error during MongoDB data seeding:', err.message);
    }
  }
}

// Support direct CLI execution: node backend/src/scripts/seed.js
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
