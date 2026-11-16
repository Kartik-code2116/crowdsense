/** Samples configured network streams and records only successful AI detections. */
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const Detection = require('../models/Detection');
const aiClient = require('../services/aiClient');
const alertEngine = require('../services/alertEngine');
const { getIsConnected } = require('../config/db');

const MIN_SAMPLE_INTERVAL_MS = 5000;
const MAX_CONCURRENT_STREAMS = 2;

class VideoProcessorWorker {
  constructor() {
    this.isRunning = false;
    this.intervalHandle = null;
    this.inFlight = new Set();
    this.lastSampleAt = new Map();
    this.failures = new Map();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('✓ Live stream inference worker started');
    this.intervalHandle = setInterval(() => this.scheduleSamples(), 1000);
  }

  async scheduleSamples() {
    if (!this.isRunning || !getIsConnected() || this.inFlight.size >= MAX_CONCURRENT_STREAMS) return;
    try {
      const cameras = await Camera.find({ status: { $ne: 'Offline' } }).limit(100).lean();
      const now = Date.now();
      for (const camera of cameras) {
        if (this.inFlight.size >= MAX_CONCURRENT_STREAMS) break;
        if (!this.isSupported(camera) || this.inFlight.has(camera._id)) continue;
        const sampleInterval = Math.max(MIN_SAMPLE_INTERVAL_MS, 1000 / Math.max(0.1, Number(camera.sampleFps) || 1));
        if (now - (this.lastSampleAt.get(camera._id) || 0) < sampleInterval) continue;
        this.lastSampleAt.set(camera._id, now);
        this.inFlight.add(camera._id);
        this.processCamera(camera).finally(() => this.inFlight.delete(camera._id));
      }
    } catch (error) {
      console.error('[stream-worker] scheduling failed:', error.message);
    }
  }

  isSupported(camera) {
    const url = String(camera.streamUrl || '').trim();
    const type = String(camera.streamType || '').toLowerCase();
    if (!url || type === 'webcam' || type === 'demo' || type === 'mock') return false;
    return /^(https?:\/\/|rtsp:\/\/)/i.test(url) || /(youtube\.com|youtu\.be|twitch\.tv|vimeo\.com|dailymotion\.com)/i.test(url);
  }

  async processCamera(camera) {
    try {
      const zone = await Zone.findOne({ $or: [{ _id: camera.zoneId }, { id: camera.zoneId }], userId: camera.userId }).lean();
      if (!zone) throw new Error(`Zone ${camera.zoneId} is missing`);
      const model = camera.modelType === 'yolov8' ? 'yolov8' : 'csrnet';
      const scan = await aiClient.scanStream(camera.streamUrl, model, zone.maxCapacity, zone.warningThresholdPct, zone.criticalThresholdPct);
      const result = scan.telemetry;
      if (scan.status !== 'success' || !result || !Number.isFinite(Number(result.count))) throw new Error('AI service returned no crowd count');

      const count = Math.max(0, Math.round(Number(result.count)));
      const modelUsed = result.model || model.toUpperCase();
      await Camera.findOneAndUpdate({ _id: camera._id, userId: camera.userId }, {
        $set: { lastCount: count, lastActive: new Date(), lastLatencyMs: result.latency_ms || 0, status: 'Live' }
      });
      // A zone may have several views. Use the latest count from each live camera in that zone.
      const activeCameras = await Camera.find({ userId: camera.userId, zoneId: String(camera.zoneId), status: 'Live' }).select('lastCount lastActive').lean();
      const freshAfter = Date.now() - 120000;
      const zoneCount = activeCameras.reduce((sum, item) => {
        const fresh = item.lastActive && new Date(item.lastActive).getTime() >= freshAfter;
        return sum + (fresh ? Math.max(0, Number(item.lastCount) || 0) : 0);
      }, 0);
      const occupancyPct = Math.round((zoneCount / Math.max(1, zone.maxCapacity)) * 100);
      await Promise.all([
        Zone.findOneAndUpdate({ $or: [{ _id: zone._id }, { id: zone.id }], userId: camera.userId }, {
          $set: { currentCount: zoneCount, currentOccupancyPct: occupancyPct }
        }),
        Detection.create({
          userId: camera.userId, cameraId: String(camera._id), zoneId: String(camera.zoneId), count, zoneCount,
          peakDensity: Number(result.peak_density) || 0, latencyMs: Number(result.latency_ms) || 0,
          modelUsed, flowVector: result.flow?.available ? {
            speed: Number(result.flow.average_speed_px_per_frame) || 0,
            headingDeg: Number(result.flow.dominant_heading_deg) || 0,
            direction: result.flow.flow_direction || 'Unknown'
          } : undefined,
          alertTriggered: occupancyPct >= Number(zone.warningThresholdPct || 70)
        })
      ]);
      this.failures.delete(camera._id);
      await alertEngine.evaluateThresholds(camera, zone, zoneCount, {
        snapshotBase64: scan.frame_base64 || null,
        heatmapUrl: result.heatmap_data_url || null
      });
    } catch (error) {
      const failures = (this.failures.get(camera._id) || 0) + 1;
      this.failures.set(camera._id, failures);
      if (failures >= 3) {
        await Camera.findOneAndUpdate({ _id: camera._id, userId: camera.userId }, { $set: { status: 'Degraded' } }).catch(() => {});
      }
      console.warn(`[stream-worker] ${camera.name} sample failed (${failures}): ${error.message}`);
    }
  }

  stop() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.intervalHandle = null;
    this.isRunning = false;
  }
}

module.exports = new VideoProcessorWorker();
