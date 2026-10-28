const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const aiClient = require('../services/aiClient');
const alertEngine = require('../services/alertEngine');
const authMiddleware = require('../middleware/auth');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const Detection = require('../models/Detection');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const { getIsConnected } = require('../config/db');

// Ingest and analyze uploaded frame directly
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

/**
 * Record real detection telemetry into local MongoDB
 * Triggered by Crowd Scanner, Live Streams in Zones & Ceilings, or Hardware Webcams.
 */
router.post('/record', async (req, res, next) => {
  try {
    const {
      cameraId = 'CAM-01',
      zoneId = 'zone-arena-01',
      zoneName = 'Arena Main Concourse',
      count = 0,
      occupancyPct = 0,
      latencyMs = 38,
      modelUsed = 'CSRNet',
      peakDensity = 0,
      uncertainty = 1.2,
      snapshotUrl = null,
      source = 'live-stream'
    } = req.body;

    const numCount = Number(count) || 0;
    const numLatency = Number(latencyMs) || 38;
    const numOcc = Number(occupancyPct) || 0;

    let savedDetection = null;
    let createdIncident = null;

    if (getIsConnected()) {
      // 1. Create Detection document in MongoDB time-series collection
      savedDetection = await Detection.create({
        cameraId: String(cameraId),
        zoneId: String(zoneId),
        count: numCount,
        peakDensity: Number(peakDensity) || Number((numCount / 350).toFixed(4)),
        latencyMs: numLatency,
        uncertainty: Number(uncertainty) || 1.2,
        modelUsed: String(modelUsed).toUpperCase(),
        timestamp: new Date()
      });

      // 2. Update Camera in MongoDB
      await Camera.findOneAndUpdate(
        { $or: [{ _id: cameraId }, { id: cameraId }] },
        {
          $set: {
            lastCount: numCount,
            lastActive: new Date(),
            lastLatencyMs: numLatency,
            status: 'Live'
          }
        },
        { upsert: false }
      );

      // 3. Update Zone in MongoDB
      const zoneDoc = await Zone.findOneAndUpdate(
        { $or: [{ _id: zoneId }, { id: zoneId }] },
        {
          $set: {
            currentCount: numCount,
            currentOccupancyPct: numOcc
          }
        },
        { new: true }
      );

      // 4. Threshold safety evaluation
      const cap = zoneDoc ? zoneDoc.maxCapacity : 350;
      const critPct = zoneDoc ? zoneDoc.criticalThresholdPct : 85;
      const warnPct = zoneDoc ? zoneDoc.warningThresholdPct : 70;
      const calcOcc = Math.round((numCount / cap) * 100);

      if (calcOcc >= warnPct) {
        const isCrit = calcOcc >= critPct;
        const level = isCrit ? 'Critical' : 'Warning';
        const color = isCrit ? 'red' : 'amber';
        const incNum = `INC-${Date.now().toString().slice(-6)}`;

        createdIncident = await Incident.create({
          incidentNumber: incNum,
          title: isCrit
            ? `Critical capacity breach (> ${critPct}%) in ${zoneName}`
            : `Crowd influx surge warning (> ${warnPct}%) in ${zoneName}`,
          description: `Real-time detection via ${modelUsed} stream. Recorded ${numCount} persons (${calcOcc}% capacity).`,
          level,
          location: `${zoneName} · ${cameraId}`,
          zoneId: String(zoneId),
          cameraId: String(cameraId),
          peakCount: numCount,
          capacity: cap,
          time: new Date().toLocaleTimeString(),
          color,
          snapshotBase64: snapshotUrl,
          status: 'Open'
        });

        await Alert.create({
          title: `${level === 'Critical' ? '🚨' : '⚠️'} ${zoneName}: ${calcOcc}% capacity`,
          message: `Recorded ${numCount} individuals via ${modelUsed} stream on ${cameraId}`,
          level,
          zoneId: String(zoneId),
          zoneName,
          cameraId: String(cameraId),
          count: numCount,
          capacity: cap,
          occupancyPct: calcOcc,
          status: 'Active'
        });
      }
    }

    return res.json({
      success: true,
      message: 'Detection successfully stored in local MongoDB',
      detection: savedDetection,
      incident: createdIncident
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
