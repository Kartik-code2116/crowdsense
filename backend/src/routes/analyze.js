const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const aiClient = require('../services/aiClient');
const alertEngine = require('../services/alertEngine');
const authMiddleware = require('../middleware/auth');

router.post('/frame', authMiddleware, upload.single('frame'), async (req, res, next) => {
  try {
    const { model = 'csrnet', zoneCapacity = 200, zoneName = 'Central Concourse', cameraId = 'cam_01' } = req.body;
    const buffer = req.file ? req.file.buffer : null;

    const aiResult = await aiClient.predictFrame(buffer, model, Number(zoneCapacity));

    // Evaluate thresholds
    const mockZone = { id: 'z_concourse', name: zoneName, maxCapacity: Number(zoneCapacity) };
    const mockCam = { id: cameraId, name: 'Main Camera' };
    const { alert, occupancyPct } = alertEngine.evaluateThresholds(mockCam, mockZone, aiResult.count);

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
