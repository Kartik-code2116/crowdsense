const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getAlerts = async (req, res) => {
  if (getIsConnected()) {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, data: alerts });
  }
  const store = getMemoryStore();
  return res.json({ success: true, data: store.alerts });
};

exports.getIncidents = async (req, res) => {
  if (getIsConnected()) {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: incidents });
  }
  const store = getMemoryStore();
  return res.json({ success: true, data: store.incidents });
};

exports.resolveIncident = async (req, res) => {
  const { id } = req.params;
  if (getIsConnected()) {
    const inc = await Incident.findByIdAndUpdate(id, { status: 'Resolved', level: 'Resolved', color: 'green' }, { new: true });
    return res.json({ success: true, data: inc });
  }
  const store = getMemoryStore();
  const inc = store.incidents.find(i => String(i._id) === String(id));
  if (inc) {
    inc.status = 'Resolved';
    inc.level = 'Resolved';
    inc.color = 'green';
  }
  return res.json({ success: true, data: inc });
};
