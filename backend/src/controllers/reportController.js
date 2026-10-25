const reportService = require('../services/reportService');
const { getMemoryStore } = require('../config/db');

exports.exportCSV = async (req, res) => {
  const store = getMemoryStore();
  const csv = reportService.generateCSV(store.detections, store.zones);
  
  res.header('Content-Type', 'text/csv');
  res.attachment(`crowdsense_report_${Date.now()}.csv`);
  return res.send(csv);
};

exports.getReportSummary = async (req, res) => {
  const store = getMemoryStore();
  const summary = reportService.generateSummaryMetrics(store.detections);
  res.json({ success: true, data: summary });
};
