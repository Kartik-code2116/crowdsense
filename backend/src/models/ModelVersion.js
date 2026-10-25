const mongoose = require('mongoose');

const modelVersionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  architecture: { type: String, required: true }, // e.g. 'CSRNet', 'MCNN', 'YOLOv8-baseline'
  partA_MAE: { type: Number, required: true },
  partA_RMSE: { type: Number, required: true },
  partB_MAE: { type: Number, required: true },
  partB_RMSE: { type: Number, required: true },
  avgLatencyMs: { type: Number, default: 38 },
  parameters: { type: String, default: '16.2M' },
  isActive: { type: Boolean, default: false },
  weightsFile: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ModelVersion', modelVersionSchema);
