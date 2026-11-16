const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getAlerts = async (req, res) => {
  const userId = req.user.id;

  if (getIsConnected()) {
    const alerts = await Alert.find({ userId }).sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, data: alerts });
  }

  const store = getMemoryStore();
  const filtered = (store.alerts || []).filter(a => a.userId === userId);
  return res.json({ success: true, data: filtered });
};

exports.getIncidents = async (req, res) => {
  const userId = req.user.id;

  if (getIsConnected()) {
    const incidents = await Incident.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: incidents });
  }

  const store = getMemoryStore();
  const filtered = (store.incidents || []).filter(i => i.userId === userId);
  return res.json({ success: true, data: filtered });
};

exports.resolveIncident = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  if (getIsConnected()) {
    const inc = await Incident.findOneAndUpdate(
      { $or: [{ _id: id }, { incidentNumber: id }], userId },
      { status: 'Resolved', level: 'Resolved', color: 'green' },
      { new: true }
    );
    if (!inc) return res.status(404).json({ success: false, message: 'Incident not found.' });
    await Alert.updateMany({ userId, zoneId: inc.zoneId, status: 'Active' }, { $set: { status: 'Resolved' } });
    return res.json({ success: true, data: inc });
  }

  const store = getMemoryStore();
  const inc = (store.incidents || []).find(i => (String(i._id) === String(id) || String(i.incidentNumber) === String(id)) && i.userId === userId);
  if (inc) {
    inc.status = 'Resolved';
    inc.level = 'Resolved';
    inc.color = 'green';
    (store.alerts || []).filter((alert) => alert.userId === userId && alert.zoneId === inc.zoneId && alert.status === 'Active').forEach((alert) => { alert.status = 'Resolved'; });
  }
  if (!inc) return res.status(404).json({ success: false, message: 'Incident not found.' });
  return res.json({ success: true, data: inc });
};
