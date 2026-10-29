const Camera = require('../models/Camera');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getCameras = async (req, res) => {
  const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';

  if (getIsConnected()) {
    const cameras = await Camera.find({ userId });
    return res.json({ success: true, count: cameras.length, data: cameras });
  }

  const store = getMemoryStore();
  const filtered = (store.cameras || []).filter(c => !c.userId || c.userId === userId);
  return res.json({ success: true, count: filtered.length, data: filtered });
};

exports.createCamera = async (req, res) => {
  const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';
  const { name, zoneId, zoneName, streamUrl, resolution, sampleFps, sceneType } = req.body;

  const newCam = {
    _id: `cam_${Date.now()}`,
    userId,
    name: name || 'Edge Sensor 01',
    zoneId: zoneId || 'zone-arena-01',
    zoneName: zoneName || 'Central Hall',
    streamUrl: streamUrl || '/samples/mall_concourse.jpg',
    resolution: resolution || '1920x1080',
    sampleFps: Number(sampleFps) || 2.0,
    status: 'Live',
    sceneType: sceneType || 'concourse',
    lastCount: 0,
    lastLatencyMs: 38,
    lastActive: new Date()
  };

  if (getIsConnected()) {
    const created = await Camera.create(newCam);
    return res.status(201).json({ success: true, data: created });
  }

  const store = getMemoryStore();
  if (!store.cameras) store.cameras = [];
  store.cameras.push(newCam);
  return res.status(201).json({ success: true, data: newCam });
};

exports.deleteCamera = async (req, res) => {
  const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';
  const { id } = req.params;

  if (getIsConnected()) {
    await Camera.findOneAndDelete({ _id: id, userId });
    return res.json({ success: true, message: 'Camera removed.' });
  }

  const store = getMemoryStore();
  store.cameras = (store.cameras || []).filter(c => String(c._id) !== String(id));
  return res.json({ success: true, message: 'Camera removed.' });
};
