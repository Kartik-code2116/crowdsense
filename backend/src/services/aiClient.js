const axios = require('axios');
const { AI_SERVICE_URL } = require('../config/env');

class AIClient {
  constructor() {
    this.client = axios.create({ baseURL: AI_SERVICE_URL, timeout: 25000 });
  }

  async predictFrame(imageBuffer, model = 'yolov8', zoneCapacity = 200, warningPct = 75, criticalPct = 90) {
    const FormData = require('form-data');
    const form = new FormData();
    if (imageBuffer) form.append('file', imageBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
    form.append('model', model);
    form.append('zone_capacity', String(zoneCapacity));
    form.append('warning_pct', String(warningPct));
    form.append('critical_pct', String(criticalPct));
    const response = await this.client.post('/api/v1/predict', form, { headers: form.getHeaders() });
    return response.data;
  }

  async scanStream(streamUrl, model = 'csrnet', zoneCapacity = 200, warningPct = 75, criticalPct = 90) {
    const response = await this.client.get('/api/v1/stream/scan-url', {
      params: { stream_url: streamUrl, model, zone_capacity: zoneCapacity, warning_pct: warningPct, critical_pct: criticalPct }
    });
    return response.data;
  }

  async getForecast(zoneId, historicalCounts, capacity = 250, warningPct = 70, criticalPct = 85) {
    const response = await this.client.post('/api/v1/forecast', {
      zone_id: zoneId, capacity, historical_counts: historicalCounts, forecast_steps: 8,
      warning_pct: warningPct, critical_pct: criticalPct
    });
    return response.data;
  }
}

module.exports = new AIClient();
