const mongoose = require('mongoose');

const modelVersionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  architecture: { type: String, required: true }, // e.g. 'CSRNet', 'MCNN', 'YOLOv8-baseline'
  partA_MAE: { type: Number, default: null },
  partA_RMSE: { type: Number, default: null },
  partB_MAE: { type: Number, default: null },
  partB_RMSE: { type: Number, default: null },
  avgLatencyMs: { type: Number, default: null },
  parameters: { type: String },
  isActive: { type: Boolean, default: false },
  weightsFile: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ModelVersion', modelVersionSchema);
