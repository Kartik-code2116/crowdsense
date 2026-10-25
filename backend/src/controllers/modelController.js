const modelsBenchmark = [
  {
    name: 'CSRNet (Dilated Backend)',
    version: 'v1.2.0',
    architecture: 'VGG16 + Dilated Conv Backend',
    partA_MAE: 68.2,
    partA_RMSE: 115.0,
    partB_MAE: 10.6,
    partB_RMSE: 16.0,
    avgLatencyMs: 38.4,
    parameters: '16.2M',
    type: 'Density Regression',
    isActive: true,
    description: 'Deploys 6 dilated convolution layers (dilation=2) to expand receptive field without pooling, preserving fine spatial resolution in highly congested crowds.'
  },
  {
    name: 'MCNN (Multi-Column)',
    version: 'v1.0.1',
    architecture: '3-Column Scale Invariant CNN',
    partA_MAE: 110.2,
    partA_RMSE: 173.2,
    partB_MAE: 26.4,
    partB_RMSE: 41.3,
    avgLatencyMs: 18.2,
    parameters: '0.13M',
    type: 'Density Regression',
    isActive: false,
    description: 'Uses 3 parallel CNN branches with large (9x9), medium (7x7), and small (5x5) kernels to handle varying head scale changes across camera angles.'
  },
  {
    name: 'YOLOv8 Detection Baseline',
    version: 'v8.1.0',
    architecture: 'CSPDarknet + PANet Detection Head',
    partA_MAE: 234.8,
    partA_RMSE: 312.4,
    partB_MAE: 38.5,
    partB_RMSE: 54.1,
    avgLatencyMs: 44.0,
    parameters: '25.9M',
    type: 'Object Detection (Bounding Box)',
    isActive: false,
    description: 'Object detection baseline. Suffers severe recall degradation in congested Part A (>80% head overlap) due to NMS suppression and scale limits.'
  }
];

exports.getModels = (req, res) => {
  res.json({ success: true, count: modelsBenchmark.length, data: modelsBenchmark });
};

exports.setActiveModel = (req, res) => {
  const { name } = req.body;
  modelsBenchmark.forEach(m => {
    m.isActive = m.name.toLowerCase().includes(name.toLowerCase());
  });
  res.json({ success: true, message: `Active model switched to ${name}`, data: modelsBenchmark });
};
