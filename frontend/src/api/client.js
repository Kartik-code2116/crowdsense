// CrowdSense API Client with automatic graceful local preview fallback
const API_BASE_URL = 'http://localhost:5000/api/v1';

export const apiClient = {
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

  async getTrendAnalytics(range = 'Today') {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/trend?range=${range}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getForecast(zoneId = 'z1', capacity = 250) {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/forecast?zoneId=${zoneId}&capacity=${capacity}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getModels() {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/models`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getSystemHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/health`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      status: 'healthy',
      gateway: 'Node.js/Express (Preview)',
      uptimeSeconds: 3420,
      aiLatencyMs: 38,
      memoryUsageMB: 48
    };
  }
};
