const Zone = require('../models/Zone');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getZones = async (req, res) => {
  if (getIsConnected()) {
    const zones = await Zone.find();
    return res.json({ success: true, data: zones });
  }
  const store = getMemoryStore();
  return res.json({ success: true, data: store.zones });
};

exports.updateZone = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (getIsConnected()) {
    const updated = await Zone.findByIdAndUpdate(id, updates, { new: true });
    return res.json({ success: true, data: updated });
  }
  const store = getMemoryStore();
  const zone = store.zones.find(z => String(z._id) === String(id));
  if (zone) Object.assign(zone, updates);
  return res.json({ success: true, data: zone });
};
