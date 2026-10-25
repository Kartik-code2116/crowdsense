const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: String, default: 'Alex Kumar' },
  role: { type: String, default: 'operator' },
  details: { type: String, required: true },
  ip: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
