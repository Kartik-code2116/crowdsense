import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import CCTVCanvasStream from '../components/CCTVCanvasStream';

export default function LiveMonitorView() {
  const {
    cameras,
    heatmap,
    setHeatmap,
    flowVectors,
    setFlowVectors,
    activeCameraId,
    setActiveCameraId,
    setShowAddCameraModal,
    toggleWebcamFeed,
    inspectInCrowdSearch
  } = useCrowdStore();

  const [layout, setLayout] = useState('2x2'); // '1x1', '2x2', '3x3'
  const isWebcamLive = cameras.some((c) => c.id === 'CAM-WEBCAM');

  const selectedCam = cameras.find((c) => c.id === activeCameraId) || cameras[1] || cameras[0];

  const displayedCameras = layout === '1x1'
    ? [selectedCam]
    : layout === '2x2'
      ? cameras.slice(0, 4)
      : cameras;

  const handleSnapshot = (dataUrl) => {
    inspectInCrowdSearch(dataUrl, selectedCam?.zoneId);
  };

  return (
    <div className="live-monitor-container">
      {/* Top Controls Toolbar */}
      <div className="monitor-toolbar">
        <div className="toolbar-left">
          <span className="live-badge">● LIVE OPERATOR FEEDS</span>
          <span className="toolbar-divider" />
          <span className="active-count">{cameras.length} active edge streams</span>
        </div>

        <div className="toolbar-right">
          {/* Layout switches */}
          <div className="layout-picker">
            <button className={`layout-btn ${layout === '1x1' ? 'active' : ''}`} onClick={() => setLayout('1x1')}>
              1×1 Focus
            </button>
            <button className={`layout-btn ${layout === '2x2' ? 'active' : ''}`} onClick={() => setLayout('2x2')}>
              2×2 Quad
            </button>
            <button className={`layout-btn ${layout === '3x3' ? 'active' : ''}`} onClick={() => setLayout('3x3')}>
              3×3 Matrix
            </button>
          </div>

          <button
            className={`toggle-chip ${isWebcamLive ? 'selected' : ''}`}
            onClick={toggleWebcamFeed}
            title="Enable live video stream from laptop integrated camera or connected webcam"
          >
            <span className="heat-icon">📹</span> Laptop Camera
            <span className={`switch ${isWebcamLive ? 'on' : ''}`}><i /></span>
          </button>

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

          <button className="button primary" style={{ height: '34px', fontSize: '12.5px', padding: '0 14px' }} onClick={() => setShowAddCameraModal(true)}>
            + Add Stream
          </button>
        </div>
      </div>

      <div className="monitor-main-split">
        {/* Camera Grid View */}
        <div className={`monitor-grid grid-${layout}`}>
          {displayedCameras.map((cam) => {
            const isCritical = cam.capacity >= 85;
            const isWarning = cam.capacity >= 70 && !isCritical;
            const isSelected = selectedCam.id === cam.id;

            return (
              <div
                key={cam.id}
                className={`monitor-tile ${isSelected ? 'active-tile' : ''}`}
                onClick={() => setActiveCameraId(cam.id)}
              >
                <div className="tile-header">
                  <span className="tile-id">{cam.id}</span>
                  <span className="tile-name">{cam.name}</span>
                  <span className={`tile-status ${isCritical ? 'critical' : isWarning ? 'warning' : 'normal'}`}>
                    {cam.capacity}% Cap
                  </span>
                </div>

                <div className="tile-visual">
                  <CCTVCanvasStream
                    cameraId={cam.id}
                    cameraName={cam.name}
                    count={cam.count}
                    resolution={cam.resolution}
                    fps={cam.fps}
                    latencyMs={cam.latencyMs}
                    heatmap={heatmap}
                    flowVectors={flowVectors}
                    sceneType={cam.scene}
                    height={layout === '1x1' ? 380 : layout === '2x2' ? 200 : 150}
                    onSnapshot={handleSnapshot}
                  />
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
            <div className="metric-row">
              <span>Stream Protocol</span>
              <b>RTSP over TCP (H.264)</b>
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

          <div style={{ marginTop: '14px' }}>
            <button
              className="button primary"
              style={{ width: '100%', fontSize: '12px', padding: '10px' }}
              onClick={() => {
                const canvas = document.querySelector('.active-tile canvas') || document.querySelector('canvas');
                if (canvas) {
                  inspectInCrowdSearch(canvas.toDataURL(), selectedCam?.zoneId);
                }
              }}
            >
              🔍 Deep Inspect in Crowd Search →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
