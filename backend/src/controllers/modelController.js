const modelCatalog = [
  {
    id: 'csrnet',
    name: 'CSRNet',
    architecture: 'VGG feature extractor + dilated convolution backend',
    partA_MAE: 68.2,
    partB_MAE: 10.6,
    type: 'Density regression',
    description: 'Predicts a spatial density map whose integral estimates the crowd count. Installed checkpoint and runtime results depend on deployment configuration.',
    metricsSource: 'Published ShanghaiTech CSRNet reference; not a measurement of this deployment.'
  },
  {
    id: 'yolov8',
    name: 'YOLOv8',
    architecture: 'Ultralytics YOLOv8 person detection',
    partA_MAE: null,
    partB_MAE: null,
    type: 'Object detection',
    description: 'Returns individual person detections and bounding boxes. Crowded-scene accuracy depends on the selected checkpoint and camera view.',
    metricsSource: 'No local ShanghaiTech evaluation is available.'
  }
];

exports.getModels = (_req, res) => {
  res.json({ success: true, count: modelCatalog.length, data: modelCatalog });
};

exports.setActiveModel = (req, res) => {
  const model = String(req.body?.modelType || req.body?.name || '').toLowerCase();
  if (!['csrnet', 'yolov8'].includes(model)) {
    return res.status(400).json({ success: false, message: 'Choose CSRNet or YOLOv8.' });
  }
  return res.status(400).json({
    success: false,
    message: 'Model selection belongs to each camera. Update the camera assignment in Model Lab.'
  });
};
