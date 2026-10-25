const { getMemoryStore } = require('../config/db');

function populateSeedData() {
  const store = getMemoryStore();

  store.zones = [
    {
      _id: 'z1',
      name: 'North Entrance',
      code: 'GATE-A-ZONE-01',
      floor: 'Level 1 Ground',
      maxCapacity: 200,
      warningThresholdPct: 70,
      criticalThresholdPct: 85,
      currentCount: 142,
      currentOccupancyPct: 71,
      evacuationRoutes: ['Exit A1', 'Emergency Stairwell North']
    },
    {
      _id: 'z2',
      name: 'Central Concourse',
      code: 'HALL-ZONE-02',
      floor: 'Level 1 Main Atrium',
      maxCapacity: 315,
      warningThresholdPct: 75,
      criticalThresholdPct: 90,
      currentCount: 286,
      currentOccupancyPct: 91,
      evacuationRoutes: ['Main Concourse West Doors', 'East Egress Tunnel']
    },
    {
      _id: 'z3',
      name: 'East Walkway',
      code: 'EAST-ZONE-03',
      floor: 'Level 1 Promenade',
      maxCapacity: 200,
      warningThresholdPct: 75,
      criticalThresholdPct: 90,
      currentCount: 86,
      currentOccupancyPct: 43,
      evacuationRoutes: ['East Turnstiles']
    },
    {
      _id: 'z4',
      name: 'Food Court & Lounge',
      code: 'LOUNGE-ZONE-04',
      floor: 'Level 2 Mezzanine',
      maxCapacity: 300,
      warningThresholdPct: 75,
      criticalThresholdPct: 90,
      currentCount: 192,
      currentOccupancyPct: 64,
      evacuationRoutes: ['Stairwell South', 'Fire Elevator Bank']
    }
  ];

  store.cameras = [
    {
      _id: 'cam_01',
      name: 'North Entrance Main',
      zoneId: 'z1',
      zoneName: 'GATE A · ZONE 01',
      streamUrl: 'rtsp://edge.venue.lan/cam1',
      resolution: '1920x1080',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'entrance',
      lastCount: 142,
      lastLatencyMs: 38
    },
    {
      _id: 'cam_02',
      name: 'Central Concourse Atrium',
      zoneId: 'z2',
      zoneName: 'HALL · ZONE 02',
      streamUrl: 'rtsp://edge.venue.lan/cam2',
      resolution: '2560x1440',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'concourse',
      lastCount: 286,
      lastLatencyMs: 41
    },
    {
      _id: 'cam_03',
      name: 'East Walkway Promenade',
      zoneId: 'z3',
      zoneName: 'EAST · ZONE 03',
      streamUrl: 'rtsp://edge.venue.lan/cam3',
      resolution: '1920x1080',
      sampleFps: 2.0,
      status: 'Live',
      sceneType: 'walkway',
      lastCount: 86,
      lastLatencyMs: 35
    },
    {
      _id: 'cam_04',
      name: 'Food Court Central',
      zoneId: 'z4',
      zoneName: 'LOUNGE · ZONE 04',
      streamUrl: 'rtsp://edge.venue.lan/cam4',
      resolution: '1920x1080',
      sampleFps: 1.5,
      status: 'Live',
      sceneType: 'concourse',
      lastCount: 192,
      lastLatencyMs: 39
    }
  ];

  store.incidents = [
    {
      _id: 'inc_01',
      incidentNumber: 'INC-2026-089',
      title: 'Capacity threshold exceeded',
      time: '14:32:08',
      location: 'Central concourse · Zone 02',
      level: 'Critical',
      color: 'red',
      peakCount: 286,
      capacity: 315,
      status: 'Open'
    },
    {
      _id: 'inc_02',
      incidentNumber: 'INC-2026-088',
      title: 'Crowd density increasing',
      time: '14:18:41',
      location: 'North entrance · Zone 01',
      level: 'Warning',
      color: 'amber',
      peakCount: 142,
      capacity: 200,
      status: 'Open'
    },
    {
      _id: 'inc_03',
      incidentNumber: 'INC-2026-087',
      title: 'Camera feed restored',
      time: '13:56:12',
      location: 'East walkway · Zone 03',
      level: 'Resolved',
      color: 'green',
      peakCount: 86,
      capacity: 200,
      status: 'Resolved'
    }
  ];

  store.auditLogs = [
    { action: 'Threshold Modified', user: 'Alex Kumar', role: 'admin', details: 'Zone 02 critical limit updated to 90%', ip: '192.168.1.12', timestamp: new Date(Date.now() - 3600000) },
    { action: 'Model Switched', user: 'Alex Kumar', role: 'admin', details: 'Switched primary inference backbone to CSRNet v1.2.0', ip: '192.168.1.12', timestamp: new Date(Date.now() - 7200000) },
    { action: 'Camera Reconnected', user: 'System Worker', role: 'system', details: 'East walkway CAM-03 stream re-initialized at 2 FPS', ip: '127.0.0.1', timestamp: new Date(Date.now() - 10800000) }
  ];

  console.log('✓ In-memory enterprise seed dataset initialized.');
}

module.exports = { populateSeedData };

if (require.main === module) {
  populateSeedData();
  console.log('Seed executed.');
}
