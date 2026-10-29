const Zone = require('../models/Zone');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getZones = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';

    if (getIsConnected()) {
      const zones = await Zone.find({ userId }).sort({ createdAt: 1 });
      return res.json({ success: true, count: zones.length, data: zones });
    }
    const store = getMemoryStore();
    const filtered = (store.zones || []).filter(z => !z.userId || z.userId === userId);
    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createZone = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';
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
    const newZoneData = {
      _id: zoneId,
      userId,
      name: name || 'New Safety Zone',
      code: code || `ZONE-${String(Date.now()).slice(-4)}`,
      floor: floor || 'Ground Level',
      maxCapacity: Number(maxCapacity) || 200,
      warningThresholdPct: Number(warningThresholdPct) || 75,
      criticalThresholdPct: Number(criticalThresholdPct) || 90,
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
    const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';
    const { id } = req.params;
    const updates = req.body;

    if (getIsConnected()) {
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
    const zoneIndex = (store.zones || []).findIndex(z => (String(z._id) === String(id) || String(z.id) === String(id)) && (!z.userId || z.userId === userId));
    if (zoneIndex !== -1) {
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
    const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';
    const { id } = req.params;

    if (getIsConnected()) {
      const deleted = await Zone.findOneAndDelete({ $or: [{ _id: id }, { id }], userId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Zone not found or access denied.' });
      }
      return res.json({ success: true, message: 'Zone removed successfully.' });
    }

    const store = getMemoryStore();
    store.zones = (store.zones || []).filter(z => (String(z._id) !== String(id) && String(z.id) !== String(id)) || (z.userId && z.userId !== userId));
    return res.json({ success: true, message: 'Zone removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
