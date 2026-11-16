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
    try {
      const response = await this.client.post('/api/v1/predict', form, { headers: form.getHeaders() });
      const result = response.data;
      const requestedModel = String(model).toLowerCase() === 'yolo' ? 'yolov8' : String(model).toLowerCase();
      const returnedModel = String(result?.model || '').toLowerCase() === 'yolo' ? 'yolov8' : String(result?.model || '').toLowerCase();
      if (result?.status !== 'success' || result.is_real_pytorch !== true || result.model_fallback || returnedModel !== requestedModel || result.count === undefined || result.count === null || !Number.isFinite(Number(result.count))) {
        const error = new Error(`The selected ${requestedModel.toUpperCase()} model did not return a real, valid crowd count.`);
        error.statusCode = 503;
        throw error;
      }
      return result;
    } catch (error) {
      if (error.statusCode) throw error;
      const details = error.response?.data?.detail || error.response?.data?.message || error.message || 'Inference service unavailable.';
      const inferenceError = new Error(`AI inference failed: ${details}`);
      inferenceError.statusCode = error.response?.status >= 400 && error.response?.status < 500 ? error.response.status : 503;
      throw inferenceError;
    }
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
