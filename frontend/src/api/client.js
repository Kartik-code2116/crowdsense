// CrowdSense API Client connecting to Python FastAPI AI microservice & Node.js Gateway
const AI_SERVICE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = 'http://localhost:5000/api/v1';

export const apiClient = {
  // Real PyTorch Deep Learning Inference
  async predictImage(fileBlob, model = 'yolov8', capacity = 250) {
    try {
      const formData = new FormData();
      if (fileBlob) {
        formData.append('file', fileBlob, 'frame.jpg');
      }
      formData.append('model', model);
      formData.append('zone_capacity', String(capacity));

      // Attempt direct FastAPI microservice
      const res = await fetch(`${AI_SERVICE_URL}/predict`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('FastAPI direct call deferred, trying Node gateway proxy:', e.message);
    }

    try {
      // Fallback via Node.js API Gateway
      const formData = new FormData();
      if (fileBlob) formData.append('frame', fileBlob);
      formData.append('model', model);
      formData.append('zoneCapacity', String(capacity));

      const res = await fetch(`${API_BASE_URL}/analyze/frame`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        return data.detection || data;
      }
    } catch (e) {}

    return null;
  },

  // List system connected cameras (laptop webcam and any USB/external cameras)
  async listConnectedCameras() {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/camera/devices`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Camera device listing deferred:', e.message);
    }
    return { status: 'fallback', devices: [] };
  },

  // Grab snapshot and detect from connected hardware camera (OpenCV)
  async captureCameraFrame(deviceIndex = 0, model = 'yolov8', capacity = 200) {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/camera/capture?device_index=${deviceIndex}&model=${model}&zone_capacity=${capacity}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Camera frame capture failed:', e.message);
    }
    return null;
  },

  // Real PyTorch Density Grad-CAM Explainability
  async explainGradCam(fileBlob, layer = 'backend_conv5_3') {
    try {
      const formData = new FormData();
      if (fileBlob) formData.append('file', fileBlob, 'frame.jpg');
      formData.append('layer', layer);

      const res = await fetch(`${AI_SERVICE_URL}/explain/gradcam`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Grad-CAM API call failed:', e.message);
    }
    return null;
  },

  async getCameras() {
    try {
      const res = await fetch(`${API_BASE_URL}/cameras`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getZones() {
    try {
      const res = await fetch(`${API_BASE_URL}/zones`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getIncidents() {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/incidents`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getAlerts() {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getTrendAnalytics(range = 'Today', zoneId = '') {
    try {
      const url = `${API_BASE_URL}/analytics/trends?range=${encodeURIComponent(range)}${zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getHealth() {
    try {
      const res = await fetch('http://localhost:5000/health');
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getAiHealth() {
    try {
      const res = await fetch('http://localhost:8000/health');
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getForecast(zoneId = 'z1', capacity = 250) {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          capacity: capacity,
          historical_counts: [140, 160, 190, 220, 250, 280, 286]
        })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }
};
