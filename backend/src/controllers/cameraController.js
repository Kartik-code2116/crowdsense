const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.getCameras = async (req, res) => {
  const userId = req.user.id;

  if (getIsConnected()) {
    const cameras = await Camera.find({ userId });
    return res.json({ success: true, count: cameras.length, data: cameras });
  }

  const store = getMemoryStore();
  const filtered = (store.cameras || []).filter(c => c.userId === userId);
  return res.json({ success: true, count: filtered.length, data: filtered });
};

exports.createCamera = async (req, res) => {
  const userId = req.user.id;
  const {
    id,
    name,
    zoneId,
    zoneName,
    streamUrl,
    streamType,
    modelType,
    resolution,
    sampleFps,
    sceneType,
    lastCount,
    lastSnapshot,
    snapshotUrl,
    heatmapUrl
  } = req.body;

  const cameraId = id || `CAM-${Date.now().toString().slice(-4)}`;

  if (!name || !zoneId || !streamUrl) {
    return res.status(400).json({ success: false, message: 'Camera name, zone, and stream source are required.' });
  }
  if (String(streamUrl).toLowerCase() !== 'webcam' && !String(streamUrl).startsWith('/samples/')) {
    try {
      const parsed = new URL(streamUrl);
      if (!['http:', 'https:', 'rtsp:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    } catch {
      return res.status(400).json({ success: false, message: 'Use an HTTP, HTTPS, or RTSP stream URL.' });
    }
  }
  const zone = getIsConnected()
    ? await Zone.findOne({ $or: [{ _id: zoneId }, { id: zoneId }], userId }).lean()
    : (getMemoryStore().zones || []).find((item) => String(item._id || item.id) === String(zoneId) && item.userId === userId);
  if (!zone) return res.status(404).json({ success: false, message: 'The selected zone was not found for this account.' });

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
    zoneId: String(zoneId),
    zoneName: zoneName || zone.name,
    streamUrl,
    streamType: detectedType,
    modelType: ['csrnet', 'yolov8'].includes(modelType) ? modelType : 'csrnet',
    resolution: resolution || '1920x1080',
    sampleFps: Number(sampleFps) || 2.0,
    status: 'Pending',
    sceneType: sceneType || (detectedType === 'webcam' ? 'webcam' : detectedType === 'youtube' ? 'youtube' : 'concourse'),
    lastCount: Number(lastCount) || 0,
    lastLatencyMs: 0,
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
  const userId = req.user.id;
  const { id } = req.params;

  if (getIsConnected()) {
    await Camera.findOneAndDelete({ _id: id, userId });
    return res.json({ success: true, message: 'Camera removed successfully.' });
  }

  const store = getMemoryStore();
  store.cameras = (store.cameras || []).filter(c => String(c._id) !== String(id) || c.userId !== userId);
  return res.json({ success: true, message: 'Camera removed successfully.' });
};
