// CrowdSense API client. Same-origin paths are routed by Nginx or the Vite dev proxy.
// Same-origin paths work behind Nginx in production and Vite proxies in development.
const API_BASE_URL = '/api/v1';

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
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
    } catch (e) {
      console.warn('API getMe deferred:', e.message);
    }
    return null;
  },

  // Real PyTorch Deep Learning Inference
  async predictImage(fileBlob, model = 'csrnet', capacity = 250, warningPct = 75, criticalPct = 90) {
    try {
      if (!fileBlob || !fileBlob.size) return { success: false, message: 'Choose a non-empty image before running inference.' };
      const formData = new FormData();
      formData.append('frame', fileBlob, 'frame.jpg');
      formData.append('model', model);
      formData.append('zoneCapacity', String(capacity));
      formData.append('warningPct', String(warningPct));
      formData.append('criticalPct', String(criticalPct));

      const res = await fetch(`${API_BASE_URL}/inference/predict`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      return { success: false, message: data.detail || data.message || `Inference service returned HTTP ${res.status}.` };
    } catch (e) {
      console.warn('Model inference request failed:', e.message);
      return { success: false, message: 'Could not reach the inference service. Check that the AI service is running and try again.' };
    }
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

  async createCamera(cameraData) {
    try {
      const res = await fetch(`${API_BASE_URL}/cameras`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(cameraData)
      });
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
    } catch (e) {
      console.warn('createCamera error:', e.message);
    }
    return null;
  },

  async deleteCamera(cameraId) {
    try {
      const res = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false)
      });
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
    } catch (e) {
      console.warn('deleteCamera error:', e.message);
    }
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
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
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
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
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
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
    } catch (e) {
      console.warn('deleteZone error:', e.message);
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

  async resolveIncident(incidentId) {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/incidents/${encodeURIComponent(incidentId)}/resolve`, {
        method: 'PUT', headers: getAuthHeaders(false)
      });
      const data = await res.json();
      return res.ok ? data : { ...data, success: false, status: res.status };
    } catch (e) {
      return { success: false, message: e.message || 'Could not update the incident.' };
    }
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
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getBackendHealth() {
    return this.getHealth();
  },

  async getAiHealth() {
    try {
      const res = await fetch('/ai/health');
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

};
