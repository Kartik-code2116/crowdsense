const Zone = require('../models/Zone');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getZones = async (req, res) => {
  try {
    if (getIsConnected()) {
      const zones = await Zone.find().sort({ createdAt: 1 });
      return res.json({ success: true, count: zones.length, data: zones });
    }
    const store = getMemoryStore();
    return res.json({ success: true, count: store.zones.length, data: store.zones });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createZone = async (req, res) => {
  try {
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
    store.zones.push(newZoneData);
    return res.status(201).json({ success: true, data: newZoneData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (getIsConnected()) {
      const updated = await Zone.findByIdAndUpdate(id, updates, { new: true });
      return res.json({ success: true, data: updated });
    }

    const store = getMemoryStore();
    const zoneIndex = store.zones.findIndex(z => String(z._id) === String(id));
    if (zoneIndex !== -1) {
      store.zones[zoneIndex] = { ...store.zones[zoneIndex], ...updates };
      return res.json({ success: true, data: store.zones[zoneIndex] });
    }

    return res.status(404).json({ success: false, message: 'Zone not found' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      await Zone.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Zone successfully removed.' });
    }

    const store = getMemoryStore();
    store.zones = store.zones.filter(z => String(z._id) !== String(id));
    return res.json({ success: true, message: 'Zone successfully removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
