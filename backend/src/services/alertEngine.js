const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const { getIsConnected, getMemoryStore } = require('../config/db');

/**
 * Alert Engine Service
 * Compares incoming detection counts against Zone capacities.
 * Fires events to Socket.io when thresholds are breached and saves to MongoDB.
 */
class AlertEngine {
  constructor() {
    this.io = null;
  }

  setSocketIO(ioInstance) {
    this.io = ioInstance;
  }

  async evaluateThresholds(camera, zone, count, evidence = {}) {
    const capacity = zone.maxCapacity || 200;
    const occupancyPct = Math.round((count / capacity) * 100);
    const userId = camera.userId;
    if (!userId) throw new Error('Cannot create an alert without a camera owner.');
    const warningPct = zone.warningThresholdPct || 75;
    const criticalPct = zone.criticalThresholdPct || 90;

    let alert = null;

    if (occupancyPct >= criticalPct) {
      alert = {
        userId,
        title: 'Critical Capacity Exceeded',
        message: `${zone.name} reached ${occupancyPct}% of maximum capacity (${count}/${capacity} people).`,
        level: 'Critical',
        color: 'red',
        zoneId: String(zone._id || zone.id),
        zoneName: zone.name,
        cameraId: String(camera._id || camera.id),
        count: count,
        capacity: capacity,
        occupancyPct: occupancyPct,
        status: 'Active',
        createdAt: new Date()
      };
    } else if (occupancyPct >= warningPct) {
      alert = {
        userId,
        title: 'Crowd Density Warning',
        message: `${zone.name} approaching upper threshold at ${occupancyPct}% capacity.`,
        level: 'Warning',
        color: 'amber',
        zoneId: String(zone._id || zone.id),
        zoneName: zone.name,
        cameraId: String(camera._id || camera.id),
        count: count,
        capacity: capacity,
        occupancyPct: occupancyPct,
        status: 'Active',
        createdAt: new Date()
      };
    }

    if (alert) {
      let created = true;
      if (getIsConnected()) {
        try {
          const existing = await Alert.findOne({ userId: alert.userId, zoneId: alert.zoneId, status: 'Active' });
          if (existing) {
            await Alert.findByIdAndUpdate(existing._id, { $set: { count, capacity, occupancyPct, message: alert.message, level: alert.level, title: alert.title } });
            await Incident.findOneAndUpdate({ userId: alert.userId, zoneId: alert.zoneId, status: { $ne: 'Resolved' } }, {
              $set: { peakCount: count, level: alert.level, title: alert.title, description: alert.message, ...(evidence.snapshotBase64 ? { snapshotBase64: evidence.snapshotBase64 } : {}), ...(evidence.heatmapUrl ? { heatmapUrl: evidence.heatmapUrl } : {}) }
            });
            created = false;
          } else {
            await Alert.create(alert);
            await Incident.create({
              userId: alert.userId,
              incidentNumber: `INC-${Date.now().toString().slice(-6)}`,
              title: alert.title,
              description: alert.message,
              level: alert.level,
              location: `${zone.name} · ${camera.name || alert.cameraId}`,
              zoneId: alert.zoneId,
              cameraId: alert.cameraId,
              peakCount: count,
              capacity,
              time: new Date().toLocaleTimeString(),
              color: alert.color,
              status: 'Open',
              snapshotBase64: evidence.snapshotBase64 || undefined,
              heatmapUrl: evidence.heatmapUrl || undefined
            });
          }
        } catch (e) {}
      } else {
        const store = getMemoryStore();
        const existing = store.alerts.find((item) => item.userId === alert.userId && item.zoneId === alert.zoneId && item.status === 'Active');
        if (existing) {
          Object.assign(existing, { count, capacity, occupancyPct, message: alert.message, level: alert.level, title: alert.title });
          const incident = store.incidents.find((item) => item.userId === alert.userId && item.zoneId === alert.zoneId && item.status !== 'Resolved');
          if (incident) Object.assign(incident, { peakCount: count, level: alert.level, title: alert.title, description: alert.message, snapshotBase64: evidence.snapshotBase64 || incident.snapshotBase64, heatmapUrl: evidence.heatmapUrl || incident.heatmapUrl });
          created = false;
        } else {
          store.alerts.unshift(alert);
          store.incidents.unshift({ ...alert, id: `inc_${Date.now()}`, incidentNumber: `INC-${Date.now().toString().slice(-6)}`, peakCount: count, description: alert.message, cameraId: alert.cameraId, status: 'Open', time: new Date().toLocaleTimeString(), snapshotBase64: evidence.snapshotBase64 || null, heatmapUrl: evidence.heatmapUrl || null });
        }
      }

      if (created && this.io) {
        this.io.to(`user:${alert.userId}`).emit('alert:created', alert);
      }
    } else if (getIsConnected()) {
      await Alert.updateMany({ userId, zoneId: String(zone._id || zone.id), status: 'Active' }, { $set: { status: 'Resolved' } });
    } else {
      const store = getMemoryStore();
      store.alerts.filter((item) => item.userId === userId && item.zoneId === String(zone._id || zone.id) && item.status === 'Active').forEach((item) => { item.status = 'Resolved'; });
    }

    return { alert, occupancyPct };
  }
}

module.exports = new AlertEngine();
