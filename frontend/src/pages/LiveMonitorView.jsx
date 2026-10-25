import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function LiveMonitorView() {
  const { cameras, heatmap, setHeatmap, flowVectors, setFlowVectors, activeCameraId, setActiveCameraId } = useCrowdStore();
  const [layout, setLayout] = useState('2x2'); // '1x1', '2x2', '3x3'
  const [selectedCam, setSelectedCam] = useState(cameras[1]);

  const displayedCameras = layout === '1x1' 
    ? [selectedCam] 
    : layout === '2x2' 
      ? cameras.slice(0, 4) 
      : cameras;

  return (
    <div className="live-monitor-container">
      {/* Top Controls Toolbar */}
      <div className="monitor-toolbar">
        <div className="toolbar-left">
          <span className="live-badge">● LIVE OPERATOR FEEDS</span>
          <span className="toolbar-divider" />
          <span className="active-count">{cameras.length} cameras streaming</span>
        </div>

        <div className="toolbar-right">
          {/* Layout switches */}
          <div className="layout-picker">
            <button className={`layout-btn ${layout === '1x1' ? 'active' : ''}`} onClick={() => setLayout('1x1')}>
              1×1
            </button>
            <button className={`layout-btn ${layout === '2x2' ? 'active' : ''}`} onClick={() => setLayout('2x2')}>
              2×2
            </button>
            <button className={`layout-btn ${layout === '3x3' ? 'active' : ''}`} onClick={() => setLayout('3x3')}>
              3×3
            </button>
          </div>

          <button
            className={`toggle-chip ${heatmap ? 'selected' : ''}`}
            onClick={() => setHeatmap(!heatmap)}
          >
            <span className="heat-icon">▧</span> Density Heatmap
            <span className={`switch ${heatmap ? 'on' : ''}`}><i /></span>
          </button>

          <button
            className={`toggle-chip ${flowVectors ? 'selected' : ''}`}
            onClick={() => setFlowVectors(!flowVectors)}
          >
            <span className="heat-icon">⇗</span> Optical Flow
            <span className={`switch ${flowVectors ? 'on' : ''}`}><i /></span>
          </button>
        </div>
      </div>

      <div className="monitor-main-split">
        {/* Camera Grid View */}
        <div className={`monitor-grid grid-${layout}`}>
          {displayedCameras.map((cam, idx) => {
            const isCritical = cam.capacity >= 85;
            const isWarning = cam.capacity >= 70 && !isCritical;
            return (
              <div
                key={cam.id}
                className={`monitor-tile ${selectedCam.id === cam.id ? 'active-tile' : ''}`}
                onClick={() => setSelectedCam(cam)}
              >
                <div className="tile-header">
                  <span className="tile-id">CAM-0{idx + 1}</span>
                  <span className="tile-name">{cam.name}</span>
                  <span className={`tile-status ${isCritical ? 'critical' : isWarning ? 'warning' : 'normal'}`}>
                    {cam.capacity}% Cap
                  </span>
                </div>

                <div className="tile-visual">
                  <div className={`scene ${cam.scene}`}>
                    <div className="scene-building building-a" />
                    <div className="scene-building building-b" />
                    <div className="scene-floor" />
                    {Array.from({ length: 12 }, (_, i) => (
                      <span key={i} className={`person p${i + 1}`}>
                        <i />
                        {flowVectors && <span className="flow-arrow">↗</span>}
                      </span>
                    ))}
                    {heatmap && (
                      <>
                        <div className="heat heat-a" />
                        <div className="heat heat-b" />
                      </>
                    )}
                    {!heatmap && <div className="heatmap-off">Heatmap Hidden</div>}
                  </div>
                </div>

                <div className="tile-footer">
                  <div className="footer-metric">
                    <small>Count (Integral)</small>
                    <b>{cam.count} people</b>
                  </div>
                  <div className="footer-metric">
                    <small>Resolution</small>
                    <b>{cam.resolution}</b>
                  </div>
                  <div className="footer-metric">
                    <small>FastAPI Latency</small>
                    <b>{cam.latencyMs} ms</b>
                  </div>
                  <div className="footer-metric">
                    <small>Sample Rate</small>
                    <b>{cam.fps} FPS</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Telemetry Inspector Sidebar */}
        <aside className="monitor-sidebar-panel">
          <div className="panel-heading">
            <div>
              <h2>Camera Telemetry</h2>
              <p>{selectedCam.name}</p>
            </div>
            <span className="live-pill"><i /> {selectedCam.status}</span>
          </div>

          <div className="telemetry-card">
            <div className="metric-row">
              <span>Assigned Zone</span>
              <b>{selectedCam.zone}</b>
            </div>
            <div className="metric-row">
              <span>Current Crowd Count</span>
              <b style={{ color: '#3478e5', fontSize: '15px' }}>{selectedCam.count} persons</b>
            </div>
            <div className="metric-row">
              <span>Zone Capacity Status</span>
              <b className={selectedCam.capacity > 85 ? 'text-red' : selectedCam.capacity > 70 ? 'text-amber' : 'text-green'}>
                {selectedCam.capacity}% ({selectedCam.count}/{selectedCam.maxCapacity})
              </b>
            </div>
            <div className="progress-track" style={{ marginTop: '8px', marginBottom: '14px' }}>
              <div
                className={`progress-fill ${selectedCam.capacity > 85 ? 'critical' : selectedCam.capacity > 70 ? 'warning' : 'normal'}`}
                style={{ width: `${selectedCam.capacity}%` }}
              />
            </div>
          </div>

          <div className="telemetry-card">
            <h3>AI Inference Telemetry</h3>
            <div className="metric-row">
              <span>Active Model</span>
              <b>CSRNet Dilated (PyTorch)</b>
            </div>
            <div className="metric-row">
              <span>Inference Time</span>
              <b>{selectedCam.latencyMs} ms</b>
            </div>
            <div className="metric-row">
              <span>Peak Crowd Density</span>
              <b>0.92 heads/m²</b>
            </div>
            <div className="metric-row">
              <span>Uncertainty (σ)</span>
              <b>± 3.4 heads</b>
            </div>
          </div>

          <div className="telemetry-card">
            <h3>Crowd Motion Dynamics</h3>
            <div className="metric-row">
              <span>Farneback Velocity</span>
              <b>1.42 px/frame</b>
            </div>
            <div className="metric-row">
              <span>Dominant Vector</span>
              <b>East-Southeast (52°)</b>
            </div>
            <div className="metric-row">
              <span>Turbulence Index</span>
              <b style={{ color: '#27b383' }}>Low (0.18)</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
