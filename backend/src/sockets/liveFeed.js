/**
 * Socket.IO Live Feed Service
 * Broadcasts real-time camera updates, density changes, and urgent safety alerts
 * to connected dashboard operators.
 */
module.exports = function initializeLiveFeedSocket(io) {
  io.on('connection', (socket) => {
    // console.log(`[Socket.io] Dashboard connected: ${socket.id}`);

    socket.emit('system:connected', {
      timestamp: new Date().toISOString(),
      activeFeeds: 12,
      model: 'CSRNet v1.2.0'
    });

    socket.on('subscribe:camera', (cameraId) => {
      socket.join(`camera:${cameraId}`);
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Simulated live camera sampling tick every 3 seconds
  setInterval(() => {
    const liveTick = {
      timestamp: new Date().toLocaleTimeString(),
      cameras: [
        { id: 'cam_01', count: 140 + Math.floor(Math.random() * 8) - 4, capacity: 72 },
        { id: 'cam_02', count: 284 + Math.floor(Math.random() * 6) - 3, capacity: 91 },
        { id: 'cam_03', count: 85 + Math.floor(Math.random() * 4) - 2, capacity: 43 }
      ],
      venueTotal: 1284 + Math.floor(Math.random() * 10) - 5
    };
    io.emit('telemetry:tick', liveTick);
  }, 3000);
};
