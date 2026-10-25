const Camera = require('../models/Camera');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getCameras = async (req, res) => {
  if (getIsConnected()) {
    const cameras = await Camera.find();
    return res.json({ success: true, count: cameras.length, data: cameras });
  }
  const store = getMemoryStore();
  return res.json({ success: true, count: store.cameras.length, data: store.cameras });
};

exports.createCamera = async (req, res) => {
  const { name, zoneId, zoneName, streamUrl, resolution, sampleFps, sceneType } = req.body;
  const newCam = {
    name,
    zoneId: zoneId || 'z1',
    zoneName: zoneName || 'Central Hall',
    streamUrl: streamUrl || 'mock://feed',
    resolution: resolution || '1920x1080',
    sampleFps: sampleFps || 2.0,
    status: 'Live',
    sceneType: sceneType || 'concourse',
    lastCount: Math.floor(Math.random() * 80) + 60,
    lastLatencyMs: 38
  };

  if (getIsConnected()) {
    const created = await Camera.create(newCam);
    return res.status(201).json({ success: true, data: created });
  }

  const store = getMemoryStore();
  newCam._id = `cam_${Date.now()}`;
  store.cameras.push(newCam);
  return res.status(201).json({ success: true, data: newCam });
};

exports.deleteCamera = async (req, res) => {
  const { id } = req.params;
  if (getIsConnected()) {
    await Camera.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Camera removed.' });
  }
  const store = getMemoryStore();
  store.cameras = store.cameras.filter(c => String(c._id) !== String(id));
  return res.json({ success: true, message: 'Camera removed.' });
};
