// CrowdSense API Client connecting to CSRNet Deep Learning Model & Node.js Gateway
const AI_SERVICE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = 'http://localhost:5000/api/v1';

// Helper to construct request headers with JWT token authentication
const getAuthHeaders = (isJson = true) => {
  const token = localStorage.getItem('crowdsense_token');
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const apiClient = {
  // Authentication: Login Administrator
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('API login failed:', e.message);
      return { success: false, message: e.message };
    }
  },

  // Authentication: Register Administrator
  async register(userData) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('API registration failed:', e.message);
      return { success: false, message: e.message };
    }
  },

  // Authentication: Fetch Current Administrator Profile
  async getMe() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getMe deferred:', e.message);
    }
    return null;
  },

  // Real PyTorch Deep Learning Inference
  async predictImage(fileBlob, model = 'yolov8', capacity = 250) {
    try {
      const formData = new FormData();
      if (fileBlob) {
        formData.append('file', fileBlob, 'frame.jpg');
      }
      formData.append('model', model);
      formData.append('zone_capacity', String(capacity));

      // Attempt direct deep learning model inference
      const res = await fetch(`${AI_SERVICE_URL}/predict`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Model direct call deferred, trying Node gateway proxy:', e.message);
    }

    try {
      // Fallback via Node.js API Gateway with Auth
      const formData = new FormData();
      if (fileBlob) formData.append('frame', fileBlob);
      formData.append('model', model);
      formData.append('zoneCapacity', String(capacity));

      const token = localStorage.getItem('crowdsense_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/analyze/frame`, {
        method: 'POST',
        headers,
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
      const res = await fetch(`${API_BASE_URL}/cameras`, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getZones() {
    try {
      const res = await fetch(`${API_BASE_URL}/zones`, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async createZone(zoneData) {
    try {
      const res = await fetch(`${API_BASE_URL}/zones`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(zoneData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('createZone error:', e.message);
    }
    return null;
  },

  async updateZone(zoneId, updates) {
    try {
      const res = await fetch(`${API_BASE_URL}/zones/${zoneId}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(updates)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('updateZone error:', e.message);
    }
    return null;
  },

  async deleteZone(zoneId) {
    try {
      const res = await fetch(`${API_BASE_URL}/zones/${zoneId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('deleteZone error:', e.message);
    }
    return null;
  },

  // Scan live streaming URL via AI service
  async scanStreamUrl(streamUrl, model = 'yolov8', capacity = 200) {
    try {
      const url = `${AI_SERVICE_URL}/stream/scan-url?stream_url=${encodeURIComponent(streamUrl)}&model=${encodeURIComponent(model)}&zone_capacity=${encodeURIComponent(capacity)}`;
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('AI microservice stream scan deferred, trying direct predict if image:', e.message);
    }
    return null;
  },

  // Persist real detection telemetry directly to local MongoDB (scoped to authenticated admin)
  async saveDetection(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/analyze/record`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Persist detection to MongoDB notice:', e.message);
    }
    return null;
  },

  // Fetch real audit logs directly from MongoDB (scoped to authenticated admin)
  async getAuditLogs(limit = 50, zoneId = '') {
    try {
      const url = `${API_BASE_URL}/reports/audit-logs?limit=${limit}${zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : ''}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fetch audit logs from MongoDB notice:', e.message);
    }
    return null;
  },

  async getIncidents() {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/incidents`, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getAlerts() {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getTrendAnalytics(range = 'Today', zoneId = '') {
    try {
      const url = `${API_BASE_URL}/analytics/trends?range=${encodeURIComponent(range)}${zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : ''}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(false)
      });
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
