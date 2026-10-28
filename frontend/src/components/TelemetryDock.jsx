import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import { Database, Cpu, Video, Clock, Minimize2, Maximize2, Radio, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TelemetryDock() {
  const [minimized, setMinimized] = useState(false);
  const {
    dbConnected,
    dbSource,
    aiConnected,
    aiModelInfo,
    cameras,
    lastSyncTimestamp
  } = useCrowdStore();

  const isHealthy = dbConnected && aiConnected;

  if (minimized) {
    return (
      <aside aria-label="System telemetry quick status" className="telemetry-dock-pill" onClick={() => setMinimized(false)} title="Click to view detailed system telemetry">
        <span className={`status-dot ${isHealthy ? 'green' : 'red'}`} />
        <Database size={13} className="telemetry-pill-icon" />
        <span className="telemetry-pill-label">
          {dbConnected ? 'DB: 27017' : 'DB: Offline'}
        </span>
        <span className="telemetry-pill-sep">•</span>
        <Cpu size={13} className="telemetry-pill-icon" />
        <span className="telemetry-pill-label">
          {aiConnected ? 'CSRNet AI' : 'AI Offline'}
        </span>
        <span className="telemetry-pill-sep">•</span>
        <Video size={13} className="telemetry-pill-icon" />
        <span className="telemetry-pill-label">{cameras.length} Cam</span>
        <button
          className="telemetry-dock-expand-btn"
          aria-label="Expand telemetry panel"
          onClick={(e) => {
            e.stopPropagation();
            setMinimized(false);
          }}
          title="Expand Telemetry Panel"
        >
          <Maximize2 size={12} />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="System telemetry telemetry dock" className="telemetry-dock-card">
      <div className="telemetry-dock-header">
        <div className="telemetry-dock-title">
          <span className={`status-dot ${dbConnected ? 'green' : 'red'}`} />
          <div>
            <strong>{dbConnected ? (dbSource || 'MongoDB Local (27017)') : 'Database Offline'}</strong>
            <small>{dbConnected ? 'Real time-series collection connected' : 'Backend not reachable'}</small>
          </div>
        </div>
        <div className="telemetry-dock-header-actions">
          <span className={`telemetry-health-tag ${isHealthy ? 'healthy' : 'warning'}`}>
            <Radio size={11} className="telemetry-pulse-icon" />
            {isHealthy ? 'LIVE' : 'DEGRADED'}
          </span>
          <button
            className="telemetry-dock-min-btn"
            onClick={() => setMinimized(true)}
            aria-label="Minimize telemetry panel"
            title="Minimize to Corner Pill"
          >
            <Minimize2 size={13} />
          </button>
        </div>
      </div>

      <div className="telemetry-dock-metrics">
        <div className="telemetry-metric-row">
          <div className="telemetry-metric-label">
            <Cpu size={13} />
            <span>FastAPI AI Service</span>
          </div>
          <span
            className="telemetry-metric-value"
            style={{ color: aiConnected ? '#159b6f' : '#cf4b54' }}
          >
            {aiConnected ? (aiModelInfo || 'PyTorch CSRNet (CPU)') : '⚠ Offline'}
          </span>
        </div>

        <div className="telemetry-metric-row">
          <div className="telemetry-metric-label">
            <Video size={13} />
            <span>Active Cameras</span>
          </div>
          <span className="telemetry-metric-value">
            <b>{cameras.length} / {cameras.length} Live</b>
          </span>
        </div>

        <div className="telemetry-metric-row">
          <div className="telemetry-metric-label">
            <Clock size={13} />
            <span>DB Telemetry Sync</span>
          </div>
          <span
            className="telemetry-metric-value sync-time"
            style={{ color: '#159b6f' }}
          >
            {lastSyncTimestamp || new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </aside>
  );
}
