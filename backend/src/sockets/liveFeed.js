const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const { getIsConnected, getMemoryStore } = require('../config/db');

module.exports = function initializeLiveFeedSocket(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    socket.emit('system:connected', {
      timestamp: new Date().toISOString(),
      database: getIsConnected() ? 'MongoDB-Connected' : 'In-Memory',
      authenticated: true
    });

    socket.on('subscribe:camera', async (cameraId) => {
      const ownsCamera = getIsConnected()
        ? await Camera.exists({ _id: String(cameraId), userId })
        : getMemoryStore().cameras.some((camera) => String(camera._id || camera.id) === String(cameraId) && camera.userId === userId);
      if (ownsCamera) socket.join(`user:${userId}:camera:${cameraId}`);
    });
  });

  setInterval(async () => {
    try {
      const userIds = new Set([...io.sockets.sockets.values()].map((socket) => socket.data.userId).filter(Boolean));
      for (const userId of userIds) {
        const cameras = getIsConnected()
          ? await Camera.find({ userId }).lean()
          : getMemoryStore().cameras.filter((camera) => camera.userId === userId);
        const zones = getIsConnected()
          ? await Zone.find({ userId }).lean()
          : getMemoryStore().zones.filter((zone) => zone.userId === userId);
        const camerasData = cameras.map((camera) => {
          const isBrowserWebcam = camera.streamType === 'webcam' || camera.sceneType === 'webcam' || String(camera.streamUrl || '').toLowerCase() === 'webcam';
          const sampleTime = camera.lastActive ? new Date(camera.lastActive).getTime() : 0;
          const staleWebcam = isBrowserWebcam && (!sampleTime || Date.now() - sampleTime > 120000);
          return {
            id: String(camera._id || camera.id),
            name: camera.name,
            zoneId: camera.zoneId,
            count: Number(camera.lastCount) || 0,
            latencyMs: Number(camera.lastLatencyMs) || 0,
            status: staleWebcam ? 'Pending' : camera.status || 'Pending',
            lastActive: camera.lastActive || null
          };
        });
        const liveTick = {
          timestamp: new Date().toLocaleTimeString(),
          source: getIsConnected() ? 'Local-MongoDB' : 'Memory-Fallback',
          cameras: camerasData,
          zones: zones.map((zone) => ({
            id: String(zone._id || zone.id),
            currentCount: Number(zone.currentCount) || 0,
            occupancyPct: Number(zone.currentOccupancyPct) || 0
          }))
        };
        io.to(`user:${userId}`).emit('telemetry:tick', liveTick);
      }
    } catch (error) {
      console.warn('[socket] telemetry broadcast failed:', error.message);
    }
  }, 3000);
};
