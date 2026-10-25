/**
 * Alert Engine Service
 * Compares incoming detection counts against Zone capacities.
 * Fires events to Socket.io when thresholds are breached.
 */
class AlertEngine {
  constructor() {
    this.io = null;
  }

  setSocketIO(ioInstance) {
    this.io = ioInstance;
  }

  evaluateThresholds(camera, zone, count) {
    const capacity = zone.maxCapacity || 200;
    const occupancyPct = Math.round((count / capacity) * 100);
    const warningPct = zone.warningThresholdPct || 75;
    const criticalPct = zone.criticalThresholdPct || 90;

    let alert = null;

    if (occupancyPct >= criticalPct) {
      alert = {
        title: 'Critical Capacity Exceeded',
        message: `${zone.name} reached ${occupancyPct}% of maximum capacity (${count}/${capacity} people).`,
        level: 'Critical',
        color: 'red',
        zoneId: zone._id || zone.id,
        zoneName: zone.name,
        cameraId: camera._id || camera.id,
        count: count,
        capacity: capacity,
        occupancyPct: occupancyPct,
        status: 'Active',
        createdAt: new Date()
      };
    } else if (occupancyPct >= warningPct) {
      alert = {
        title: 'Crowd Density Warning',
        message: `${zone.name} approaching upper threshold at ${occupancyPct}% capacity.`,
        level: 'Warning',
        color: 'amber',
        zoneId: zone._id || zone.id,
        zoneName: zone.name,
        cameraId: camera._id || camera.id,
        count: count,
        capacity: capacity,
        occupancyPct: occupancyPct,
        status: 'Active',
        createdAt: new Date()
      };
    }

    if (alert && this.io) {
      this.io.emit('alert:created', alert);
    }

    return { alert, occupancyPct };
  }
}

module.exports = new AlertEngine();
