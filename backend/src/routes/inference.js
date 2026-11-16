const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const aiClient = require('../services/aiClient');

const router = express.Router();
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype?.startsWith('image/')) return callback(null, true);
    const error = new Error('Upload an image file (JPEG, PNG, WebP, or another supported image format).');
    error.statusCode = 400;
    return callback(error);
  }
});

router.post('/predict', authMiddleware, uploadImage.single('frame'), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ success: false, message: 'Upload a non-empty image to run inference.' });
    }
    const model = String(req.body.model || 'csrnet').toLowerCase();
    if (!['csrnet', 'yolov8'].includes(model)) {
      return res.status(400).json({ success: false, message: 'Choose CSRNet or YOLOv8.' });
    }
    const requestedCapacity = Number(req.body.zoneCapacity);
    const capacity = Number.isFinite(requestedCapacity) && requestedCapacity > 0 ? Math.round(requestedCapacity) : 200;
    const warningPct = Number(req.body.warningPct) || 75;
    const criticalPct = Number(req.body.criticalPct) || 90;
    if (warningPct < 1 || criticalPct > 100 || warningPct >= criticalPct) {
      return res.status(400).json({ success: false, message: 'Warning and critical thresholds must be valid, with critical above warning.' });
    }
    const detection = await aiClient.predictFrame(req.file.buffer, model, capacity, warningPct, criticalPct);
    return res.json({ success: true, ...detection });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
