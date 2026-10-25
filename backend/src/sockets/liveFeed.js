const Camera = require('../models/Camera');
const { getIsConnected, getMemoryStore } = require('../config/db');

/**
 * Socket.IO Live Feed Service
 * Broadcasts real-time camera updates, density changes, and urgent safety alerts
 * directly from local MongoDB to connected dashboard operators.
 */
module.exports = function initializeLiveFeedSocket(io) {
  io.on('connection', (socket) => {
    socket.emit('system:connected', {
      timestamp: new Date().toISOString(),
      database: getIsConnected() ? 'MongoDB-Connected' : 'In-Memory',
      activeFeeds: 6,
      model: 'CSRNet v1.2.0 (ShanghaiTech Dilated Conv)'
    });

    socket.on('subscribe:camera', (cameraId) => {
      socket.join(`camera:${cameraId}`);
    });
  });

  // Live camera sampling tick every 3 seconds from MongoDB
  setInterval(async () => {
    try {
      let camerasData = [];
      let totalCount = 0;

      if (getIsConnected()) {
        const cams = await Camera.find().lean();
        camerasData = cams.map(c => {
          totalCount += (c.lastCount || 0);
          return {
            id: String(c._id),
            name: c.name,
            count: c.lastCount || 0,
            latencyMs: c.lastLatencyMs || 36,
            status: c.status
          };
        });
      } else {
        const store = getMemoryStore();
        camerasData = store.cameras.map(c => {
          totalCount += (c.lastCount || 0);
          return {
            id: String(c._id),
            name: c.name,
            count: c.lastCount || 0,
            latencyMs: c.lastLatencyMs || 36,
            status: c.status
          };
        });
      }

      const liveTick = {
        timestamp: new Date().toLocaleTimeString(),
        source: getIsConnected() ? 'Local-MongoDB' : 'Memory-Fallback',
        cameras: camerasData,
        venueTotal: totalCount
      };

      io.emit('telemetry:tick', liveTick);
    } catch (err) {
      // Continue safely
    }
  }, 3000);
};
