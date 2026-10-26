const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const aiClient = require('../services/aiClient');
const alertEngine = require('../services/alertEngine');
const authMiddleware = require('../middleware/auth');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const Detection = require('../models/Detection');
const { getIsConnected } = require('../config/db');

router.post('/frame', authMiddleware, upload.single('frame'), async (req, res, next) => {
  try {
    const { model = 'yolov8', zoneCapacity = 200, zoneName = 'Central Concourse Atrium', cameraId = 'CAM-02', zoneId = 'z2' } = req.body;
    const buffer = req.file ? req.file.buffer : null;

    const aiResult = await aiClient.predictFrame(buffer, model, Number(zoneCapacity));
    const count = Number(aiResult.count) || 0;

    // Evaluate thresholds
    const mockZone = { id: zoneId, name: zoneName, maxCapacity: Number(zoneCapacity) };
    const mockCam = { id: cameraId, name: cameraId };
    const { alert, occupancyPct } = alertEngine.evaluateThresholds(mockCam, mockZone, count);

    // Sync to MongoDB if connected
    if (getIsConnected()) {
      try {
        await Camera.findByIdAndUpdate(cameraId, {
          lastCount: count,
          lastActive: new Date(),
          lastLatencyMs: aiResult.latency_ms || 38
        });

        await Zone.findByIdAndUpdate(zoneId, {
          currentCount: count,
          currentOccupancyPct: occupancyPct
        });

        await Detection.create({
          cameraId: String(cameraId),
          zoneId: String(zoneId),
          count,
          peakDensity: aiResult.peak_density || Number((count / Number(zoneCapacity)).toFixed(4)),
          latencyMs: aiResult.latency_ms || 38,
          modelUsed: model.toUpperCase()
        });
      } catch (dbErr) {
        console.warn('MongoDB sync on frame analyze:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      detection: {
        ...aiResult,
        occupancyPct,
        alertFired: !!alert,
        activeAlert: alert
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
