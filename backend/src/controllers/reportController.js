const reportService = require('../services/reportService');
const { getIsConnected, getMemoryStore } = require('../config/db');
const Detection = require('../models/Detection');
const Zone = require('../models/Zone');
const Camera = require('../models/Camera');
const Incident = require('../models/Incident');

exports.exportCSV = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let detections = [];
    let zones = [];

    if (getIsConnected()) {
      detections = await Detection.find({ userId }).sort({ timestamp: -1 }).limit(1000).lean();
      zones = await Zone.find({ userId }).lean();
    } else {
      const store = getMemoryStore();
      detections = (store.detections || []).filter(d => d.userId === userId);
      zones = (store.zones || []).filter(z => z.userId === userId);
    }

    const csv = reportService.generateCSV(detections, zones);
    res.header('Content-Type', 'text/csv');
    res.attachment(`crowdsense_regulatory_audit_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.getReportSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (getIsConnected()) {
      const totalDetections = await Detection.countDocuments({ userId });
      const peakDoc = await Detection.findOne({ userId }).sort({ count: -1 }).lean();
      const avgResult = await Detection.aggregate([
        { $match: { userId } },
        { $group: { _id: null, avgCount: { $avg: '$count' } } }
      ]);
      const avgCrowd = avgResult.length > 0 ? Math.round(avgResult[0].avgCount) : 0;
      const totalIncidents = await Incident.countDocuments({ userId });

      return res.json({
        success: true,
        source: 'MongoDB-Direct',
        data: {
          totalDetections,
          peakCrowd: peakDoc ? peakDoc.count : 0,
          avgCrowd,
          totalIncidents,
          complianceRate: null
        }
      });
    }

    const store = getMemoryStore();
    const userDets = (store.detections || []).filter(d => d.userId === userId);
    const summary = reportService.generateSummaryMetrics(userDets);
    res.json({ success: true, source: 'Memory-Fallback', data: summary });
  } catch (err) {
    next(err);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, zoneId } = req.query;
    const query = { userId };
    if (zoneId && zoneId !== 'all') query.zoneId = zoneId;

    if (getIsConnected()) {
      const detections = await Detection.find(query).sort({ timestamp: -1 }).limit(Number(limit)).lean();
      const zones = await Zone.find({ userId }).lean();
      const cameras = await Camera.find({ userId }).lean();

      const zoneMap = new Map(zones.map(z => [String(z._id || z.id), z]));
      const camMap = new Map(cameras.map(c => [String(c._id || c.id), c]));

      const enriched = detections.map(d => {
        const zone = zoneMap.get(String(d.zoneId)) || { name: 'Unknown zone', maxCapacity: 0 };
        const cam = camMap.get(String(d.cameraId)) || { name: 'Unknown camera' };
        const cap = Number(zone.maxCapacity) || 0;
        const zoneCount = Number.isFinite(Number(d.zoneCount)) ? Number(d.zoneCount) : Number(d.count) || 0;
        const occPct = cap > 0 ? Math.round((zoneCount / cap) * 100) : 0;
        return {
          id: String(d._id),
          timestamp: d.timestamp,
          timeStr: new Date(d.timestamp).toLocaleTimeString(),
          dateStr: new Date(d.timestamp).toLocaleDateString(),
          cameraId: d.cameraId,
          cameraName: cam.name,
          zoneId: d.zoneId,
          zoneName: zone.name,
          count: Number(d.count) || 0,
          zoneCount,
          capacity: cap,
          occupancyPct: occPct,
          status: occPct >= (zone.criticalThresholdPct || 85) ? 'critical' : occPct >= (zone.warningThresholdPct || 70) ? 'warning' : 'safe',
          peakDensity: d.peakDensity || 0,
          latencyMs: d.latencyMs || 0,
          modelUsed: d.modelUsed || 'CSRNet',
          snapshotUrl: d.snapshotUrl || d.snapshotBase64 || null,
          heatmapUrl: d.heatmapUrl || null,
          flowVector: d.flowVector || null
        };
      });

      return res.json({ success: true, count: enriched.length, data: enriched });
    }

    res.json({ success: true, count: 0, data: [] });
  } catch (err) {
    next(err);
  }
};
