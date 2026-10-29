const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', authMiddleware, cameraController.getCameras);
router.post('/', authMiddleware, authorize(['admin']), cameraController.createCamera);
router.delete('/:id', authMiddleware, authorize(['admin']), cameraController.deleteCamera);

module.exports = router;
