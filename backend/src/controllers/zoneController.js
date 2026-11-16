const Zone = require('../models/Zone');
const Camera = require('../models/Camera');
const { getIsConnected, getMemoryStore } = require('../config/db');

const validLimits = (capacity, warning, critical) =>
  Number.isFinite(Number(capacity)) && Number(capacity) > 0 &&
  Number.isInteger(Number(warning)) && Number(warning) >= 1 && Number(warning) <= 99 &&
  Number.isInteger(Number(critical)) && Number(critical) >= 2 && Number(critical) <= 100 &&
  Number(warning) < Number(critical);

exports.getZones = async (req, res) => {
  try {
    const userId = req.user.id;

    if (getIsConnected()) {
      const zones = await Zone.find({ userId }).sort({ createdAt: 1 });
      return res.json({ success: true, count: zones.length, data: zones });
    }
    const store = getMemoryStore();
    const filtered = (store.zones || []).filter(z => z.userId === userId);
    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createZone = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id,
      name,
      code,
      floor,
      maxCapacity,
      warningThresholdPct,
      criticalThresholdPct,
      evacuationRoutes,
      description,
      streamUrl,
      streamType
    } = req.body;

    const zoneId = id || `zone_${Date.now()}`;
    const capacity = Number(maxCapacity);
    const warningPct = Number(warningThresholdPct ?? 75);
    const criticalPct = Number(criticalThresholdPct ?? 90);
    if (!validLimits(capacity, warningPct, criticalPct)) {
      return res.status(400).json({ success: false, message: 'Capacity must be positive; warning and critical thresholds must be valid, with critical above warning.' });
    }
    const newZoneData = {
      _id: zoneId,
      userId,
      name: name || 'New Safety Zone',
      code: code || `ZONE-${String(Date.now()).slice(-4)}`,
      floor: floor || 'Ground Level',
      maxCapacity: capacity,
      warningThresholdPct: warningPct,
      criticalThresholdPct: criticalPct,
      currentCount: 0,
      currentOccupancyPct: 0,
      evacuationRoutes: Array.isArray(evacuationRoutes) ? evacuationRoutes : (evacuationRoutes ? [evacuationRoutes] : ['Emergency Egress']),
      description: description || 'User-configured safety monitoring sector.',
      streamUrl: streamUrl || '',
      streamType: streamType || 'url',
      createdAt: new Date()
    };

    if (getIsConnected()) {
      const created = await Zone.create(newZoneData);
      return res.status(201).json({ success: true, data: created });
    }

    const store = getMemoryStore();
    if (!store.zones) store.zones = [];
    store.zones.push(newZoneData);
    return res.status(201).json({ success: true, data: newZoneData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const requested = req.body || {};
    const allowed = ['name', 'code', 'floor', 'maxCapacity', 'description', 'evacuationRoutes', 'streamUrl', 'streamType'];
    const updates = Object.fromEntries(allowed.filter((key) => requested[key] !== undefined).map((key) => [key, requested[key]]));
    if (requested.warningThresholdPct !== undefined || requested.warningPct !== undefined) updates.warningThresholdPct = Number(requested.warningThresholdPct ?? requested.warningPct);
    if (requested.criticalThresholdPct !== undefined || requested.criticalPct !== undefined) updates.criticalThresholdPct = Number(requested.criticalThresholdPct ?? requested.criticalPct);

    if (getIsConnected()) {
      const current = await Zone.findOne({ $or: [{ _id: id }, { id }], userId }).lean();
      if (!current) return res.status(404).json({ success: false, message: 'Zone not found or access denied.' });
      if (!validLimits(updates.maxCapacity ?? current.maxCapacity, updates.warningThresholdPct ?? current.warningThresholdPct, updates.criticalThresholdPct ?? current.criticalThresholdPct)) {
        return res.status(400).json({ success: false, message: 'Capacity must be positive; critical threshold must be above warning.' });
      }
      const updated = await Zone.findOneAndUpdate(
        { $or: [{ _id: id }, { id }], userId },
        { $set: updates },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Zone not found or access denied.' });
      }
      return res.json({ success: true, data: updated });
    }

    const store = getMemoryStore();
    const zoneIndex = (store.zones || []).findIndex(z => (String(z._id) === String(id) || String(z.id) === String(id)) && z.userId === userId);
    if (zoneIndex !== -1) {
      const current = store.zones[zoneIndex];
      if (!validLimits(updates.maxCapacity ?? current.maxCapacity, updates.warningThresholdPct ?? current.warningThresholdPct, updates.criticalThresholdPct ?? current.criticalThresholdPct)) {
        return res.status(400).json({ success: false, message: 'Capacity must be positive; critical threshold must be above warning.' });
      }
      store.zones[zoneIndex] = { ...store.zones[zoneIndex], ...updates };
      return res.json({ success: true, data: store.zones[zoneIndex] });
    }
    return res.status(404).json({ success: false, message: 'Zone not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (getIsConnected()) {
      const attachedCamera = await Camera.exists({ userId, zoneId: String(id) });
      if (attachedCamera) return res.status(409).json({ success: false, message: 'Move cameras to another zone before deleting this zone.' });
      const deleted = await Zone.findOneAndDelete({ $or: [{ _id: id }, { id }], userId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Zone not found or access denied.' });
      }
      return res.json({ success: true, message: 'Zone removed successfully.' });
    }

    const store = getMemoryStore();
    const attachedCamera = (store.cameras || []).some((camera) => camera.userId === userId && String(camera.zoneId) === String(id));
    if (attachedCamera) return res.status(409).json({ success: false, message: 'Move cameras to another zone before deleting this zone.' });
    store.zones = (store.zones || []).filter(z => (String(z._id) !== String(id) && String(z.id) !== String(id)) || z.userId !== userId);
    return res.json({ success: true, message: 'Zone removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
