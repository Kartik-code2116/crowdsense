const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const aiClient = require('../services/aiClient');
const alertEngine = require('../services/alertEngine');
const authMiddleware = require('../middleware/auth');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const Detection = require('../models/Detection');
const { getIsConnected, getMemoryStore } = require('../config/db');

// Ingest and analyze uploaded frame directly
router.post('/frame', authMiddleware, upload.single('frame'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { model, cameraId, zoneId } = req.body;
    const buffer = req.file ? req.file.buffer : null;
    if (!buffer) return res.status(400).json({ success: false, message: 'Upload an image frame to analyze.' });
    if (!cameraId || !zoneId) return res.status(400).json({ success: false, message: 'Select a configured camera and zone before recording an analysis.' });

    const zone = getIsConnected()
      ? await Zone.findOne({ $or: [{ _id: zoneId }, { id: zoneId }], userId }).lean()
      : (getMemoryStore().zones || []).find((item) => String(item._id || item.id) === String(zoneId) && item.userId === userId);
    const camera = getIsConnected()
      ? await Camera.findOne({ $or: [{ _id: cameraId }, { id: cameraId }], userId }).lean()
      : (getMemoryStore().cameras || []).find((item) => String(item._id || item.id) === String(cameraId) && item.userId === userId);
    if (!zone || !camera || String(camera.zoneId) !== String(zoneId)) {
      return res.status(404).json({ success: false, message: 'The selected camera and zone do not belong to this account.' });
    }

    const cameraModel = camera.modelType || 'csrnet';
    if (model && String(model).toLowerCase() !== String(cameraModel).toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Select the model assigned to this camera in Model Lab before scanning.' });
    }
    const aiResult = await aiClient.predictFrame(buffer, cameraModel, Number(zone.maxCapacity), zone.warningThresholdPct, zone.criticalThresholdPct);
    const count = Number(aiResult.count) || 0;
    const now = new Date();
    let zoneCount;
    if (getIsConnected()) {
      await Camera.findOneAndUpdate({ _id: cameraId, userId }, {
        $set: { lastCount: count, lastActive: now, lastLatencyMs: Number(aiResult.latency_ms) || 0, status: 'Live' }
      });
      const activeCameras = await Camera.find({ userId, zoneId: String(zoneId), status: 'Live', lastActive: { $gte: new Date(now.getTime() - 120000) } }).select('lastCount').lean();
      zoneCount = activeCameras.reduce((sum, item) => sum + (Number(item.lastCount) || 0), 0);
    } else {
      const store = getMemoryStore();
      const memoryCamera = (store.cameras || []).find((item) => String(item._id || item.id) === String(cameraId) && item.userId === userId);
      const memoryZone = (store.zones || []).find((item) => String(item._id || item.id) === String(zoneId) && item.userId === userId);
      if (!memoryCamera || !memoryZone) return res.status(404).json({ success: false, message: 'The selected camera and zone are unavailable in this workspace.' });
      Object.assign(memoryCamera, { lastCount: count, lastActive: now, lastLatencyMs: Number(aiResult.latency_ms) || 0, status: 'Live' });
      const cutoff = now.getTime() - 120000;
      zoneCount = (store.cameras || []).filter((item) => item.userId === userId && String(item.zoneId) === String(zoneId) && item.status === 'Live' && item.lastActive && new Date(item.lastActive).getTime() >= cutoff).reduce((sum, item) => sum + (Number(item.lastCount) || 0), 0);
      Object.assign(memoryZone, { currentCount: zoneCount, currentOccupancyPct: Math.round((zoneCount / Math.max(1, memoryZone.maxCapacity)) * 100) });
      store.detections.unshift({ userId, cameraId: String(cameraId), zoneId: String(zoneId), count, zoneCount, peakDensity: Number(aiResult.peak_density) || 0, latencyMs: Number(aiResult.latency_ms) || 0, modelUsed: String(aiResult.model || cameraModel).toUpperCase(), timestamp: now });
    }
    const occupancyPct = Math.round((zoneCount / Math.max(1, zone.maxCapacity)) * 100);
    if (getIsConnected()) {
      await Zone.findOneAndUpdate({ $or: [{ _id: zoneId }, { id: zoneId }], userId }, { $set: { currentCount: zoneCount, currentOccupancyPct: occupancyPct } });
    }
    if (getIsConnected()) {
      await Detection.create({ userId, cameraId: String(cameraId), zoneId: String(zoneId), count,
        zoneCount, peakDensity: Number(aiResult.peak_density) || 0, latencyMs: Number(aiResult.latency_ms) || 0,
        modelUsed: String(aiResult.model || cameraModel).toUpperCase() });
    }
    const { alert } = await alertEngine.evaluateThresholds(camera, zone, zoneCount, {
      snapshotBase64: `data:${req.file.mimetype || 'image/jpeg'};base64,${buffer.toString('base64')}`,
      heatmapUrl: aiResult.heatmap_data_url || null
    });

    return res.json({
      success: true,
      detection: {
        ...aiResult,
        zone_count: zoneCount,
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
 * Scoped to individual user ID to guarantee complete data isolation between admins.
 */
router.post('/record', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cameraId, zoneId, count = 0, latencyMs = 0, modelUsed = 'CSRNet', peakDensity = 0, uncertainty = 0, flowVector = null } = req.body;
    if (!cameraId || !zoneId || !Number.isFinite(Number(count)) || Number(count) < 0) {
      return res.status(400).json({ success: false, message: 'cameraId, zoneId, and a non-negative count are required.' });
    }
    const numCount = Math.round(Number(count));
    const numLatency = Number(latencyMs) || 0;
    const now = new Date();
    let camera;
    let zone;
    let savedDetection;

    if (getIsConnected()) {
      zone = await Zone.findOne({ $or: [{ _id: zoneId }, { id: zoneId }], userId });
      if (!zone) return res.status(404).json({ success: false, message: 'Zone not found for this account.' });
      camera = await Camera.findOneAndUpdate({ $or: [{ _id: cameraId }, { id: cameraId }], userId }, {
        $set: { lastCount: numCount, lastActive: now, lastLatencyMs: numLatency, status: 'Live' }
      }, { new: true });
      if (!camera) return res.status(404).json({ success: false, message: 'Camera not found for this account.' });

      const activeCameras = await Camera.find({ userId, zoneId: String(zoneId), status: 'Live', lastActive: { $gte: new Date(now.getTime() - 120000) } }).select('lastCount').lean();
      zone = await Zone.findOneAndUpdate({ $or: [{ _id: zoneId }, { id: zoneId }], userId }, {
        $set: { currentCount: activeCameras.reduce((sum, item) => sum + (Number(item.lastCount) || 0), 0) }
      }, { new: true });
      const zoneCount = Number(zone?.currentCount) || 0;
      zone.currentOccupancyPct = Math.round((zoneCount / Math.max(1, zone.maxCapacity)) * 100);
      await zone.save();
      savedDetection = await Detection.create({
        userId, cameraId: String(cameraId), zoneId: String(zoneId), count: numCount,
        peakDensity: Number(peakDensity) || 0, latencyMs: numLatency, uncertainty: Number(uncertainty) || 0,
        modelUsed: String(modelUsed).toUpperCase(),
        flowVector: flowVector?.available ? {
          speed: Number(flowVector.average_speed_px_per_frame) || 0,
          headingDeg: Number(flowVector.dominant_heading_deg) || 0,
          direction: flowVector.flow_direction || 'Unknown'
        } : undefined,
        timestamp: now
      });
      savedDetection.zoneCount = zoneCount;
      await savedDetection.save();
    } else {
      const store = getMemoryStore();
      camera = (store.cameras || []).find((item) => String(item._id || item.id) === String(cameraId) && item.userId === userId);
      zone = (store.zones || []).find((item) => String(item._id || item.id) === String(zoneId) && item.userId === userId);
      if (!zone) return res.status(404).json({ success: false, message: 'Zone not found for this account.' });
      if (!camera) return res.status(404).json({ success: false, message: 'Camera not found for this account.' });
      Object.assign(camera, { lastCount: numCount, lastActive: now, lastLatencyMs: numLatency, status: 'Live' });
      const freshAfter = now.getTime() - 120000;
      const activeCameras = (store.cameras || []).filter((item) => item.userId === userId && String(item.zoneId) === String(zoneId) && item.status === 'Live' && item.lastActive && new Date(item.lastActive).getTime() >= freshAfter);
      zone.currentCount = activeCameras.reduce((sum, item) => sum + (Number(item.lastCount) || 0), 0);
      zone.currentOccupancyPct = Math.round((zone.currentCount / Math.max(1, zone.maxCapacity)) * 100);
      savedDetection = { userId, cameraId: String(cameraId), zoneId: String(zoneId), count: numCount, zoneCount: zone.currentCount, latencyMs: numLatency, modelUsed: String(modelUsed).toUpperCase(), timestamp: now };
      store.detections.unshift(savedDetection);
    }

    const zoneCount = Number(zone.currentCount) || 0;
    const { alert, occupancyPct } = await alertEngine.evaluateThresholds(camera, zone, zoneCount);

    return res.json({
      success: true,
      message: getIsConnected() ? 'Detection stored in MongoDB.' : 'Detection stored in temporary memory; records will be cleared when the service restarts.',
      detection: savedDetection,
      alert,
      zoneCount,
      occupancyPct
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
