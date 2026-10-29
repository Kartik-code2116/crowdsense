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
  const {
    id,
    name,
    zoneId,
    zoneName,
    streamUrl,
    streamType,
    resolution,
    sampleFps,
    sceneType,
    lastCount,
    lastSnapshot,
    snapshotUrl,
    heatmapUrl
  } = req.body;

  const cameraId = id || `CAM-${Date.now().toString().slice(-4)}`;

  // Determine stream type if not explicitly passed
  let detectedType = streamType || 'demo';
  const urlLower = (streamUrl || '').toLowerCase();
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    detectedType = 'youtube';
  } else if (urlLower.includes('webcam') || sceneType === 'webcam' || cameraId === 'CAM-WEBCAM') {
    detectedType = 'webcam';
  } else if (urlLower.startsWith('http') || urlLower.startsWith('rtsp')) {
    detectedType = 'url';
  }

  const newCam = {
    _id: cameraId,
    userId,
    name: name || 'Edge Camera Stream',
    zoneId: zoneId || 'zone-arena-01',
    zoneName: zoneName || 'Central Hall',
    streamUrl: streamUrl || '/samples/mall_concourse.jpg',
    streamType: detectedType,
    resolution: resolution || '1920x1080',
    sampleFps: Number(sampleFps) || 2.0,
    status: 'Live',
    sceneType: sceneType || (detectedType === 'webcam' ? 'webcam' : detectedType === 'youtube' ? 'youtube' : 'concourse'),
    lastCount: Number(lastCount) || 0,
    lastLatencyMs: 38,
    lastActive: new Date(),
    lastSnapshot: lastSnapshot || snapshotUrl || null,
    snapshotUrl: snapshotUrl || lastSnapshot || null,
    heatmapUrl: heatmapUrl || null
  };

  if (getIsConnected()) {
    // If camera with this ID already exists for this user, update it
    const existing = await Camera.findOne({ _id: cameraId, userId });
    if (existing) {
      const updated = await Camera.findOneAndUpdate(
        { _id: cameraId, userId },
        { $set: newCam },
        { new: true }
      );
      return res.status(200).json({ success: true, data: updated });
    }

    const created = await Camera.create(newCam);
    return res.status(201).json({ success: true, data: created });
  }

  const store = getMemoryStore();
  if (!store.cameras) store.cameras = [];
  const existingIdx = store.cameras.findIndex(c => String(c._id) === String(cameraId) && c.userId === userId);
  if (existingIdx !== -1) {
    store.cameras[existingIdx] = newCam;
    return res.status(200).json({ success: true, data: newCam });
  }
  store.cameras.push(newCam);
  return res.status(201).json({ success: true, data: newCam });
};

exports.deleteCamera = async (req, res) => {
  const userId = req.user ? req.user.id : '6ade4cd5c5d2c1c0ec4762e5';
  const { id } = req.params;

  if (getIsConnected()) {
    await Camera.findOneAndDelete({ _id: id, userId });
    return res.json({ success: true, message: 'Camera removed successfully.' });
  }

  const store = getMemoryStore();
  store.cameras = (store.cameras || []).filter(c => String(c._id) !== String(id) || (c.userId && c.userId !== userId));
  return res.json({ success: true, message: 'Camera removed successfully.' });
};
