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
    inspectInCrowdSearch,
    aiConnected,
    aiModelInfo,
    latestDetection
  } = useCrowdStore();

  const [layout, setLayout] = useState('2x2'); // '1x1', '2x2', '3x3', 'all'
  const [liveCounts, setLiveCounts] = useState({});
  const isWebcamLive = cameras.some((c) => c.id === 'CAM-WEBCAM');

  const selectedCam = cameras.find((c) => c.id === activeCameraId) || cameras[0] || {};

  const handleCameraCountChange = (camId, cnt) => {
    setLiveCounts((prev) => ({ ...prev, [camId]: cnt }));
  };

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
              All ({cameras.length})
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
            const currentCount = liveCounts[cam.id] !== undefined ? liveCounts[cam.id] : (cam.count || 0);
            const maxCap = cam.maxCapacity || 200;
            const currentCapacity = Math.min(100, Math.round((currentCount / maxCap) * 100));
            const isCritical = currentCapacity >= 85;
            const isWarning = currentCapacity >= 70 && !isCritical;
            const isSelected = selectedCam.id === cam.id;

            const isYt = cam.streamType === 'youtube' || (cam.streamUrl && (cam.streamUrl.includes('youtube') || cam.streamUrl.includes('youtu.be')));
            const isWb = cam.streamType === 'webcam' || cam.isWebcam || cam.id === 'CAM-WEBCAM' || (cam.streamUrl && cam.streamUrl.includes('webcam'));
            const isNet = cam.streamType === 'url' || (cam.streamUrl && cam.streamUrl.startsWith('http') && !isYt);

            return (
              <div
                key={cam.id}
                className={`monitor-tile ${isSelected ? 'active-tile' : ''}`}
                onClick={() => setActiveCameraId(cam.id)}
              >
                {/* 1. Header with live REC dot, source badge, name, capacity, and focus button */}
                <div className="tile-header">
                  <div className="tile-header-left">
                    <span className="cctv-rec-dot" title="Live Continuous Recording" />
                    <span className="cctv-badge-id">{cam.id}</span>
                    {isYt && <span className="cctv-badge-yt">🔴 YouTube Live</span>}
                    {isWb && <span className="cctv-badge-wb">📹 Webcam</span>}
                    {isNet && <span className="cctv-badge-rtsp">🌐 RTSP IP</span>}
                    {!isYt && !isWb && !isNet && <span className="cctv-badge-demo">⚡ Edge Stream</span>}
                    <span className="cctv-tile-name" title={cam.name}>{cam.name}</span>
                  </div>

                  <div className="tile-header-right">
                    <span className={`cctv-cap-badge ${isCritical ? 'crit' : isWarning ? 'warn' : 'ok'}`}>
                      <i className="status-dot" /> {currentCapacity}% Cap
                    </span>
                    <button
                      className="cctv-quick-focus"
                      title="Expand to 1x1 Focus View"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCameraId(cam.id);
                        setLayout('1x1');
                      }}
                    >
                      ⛶ Focus
                    </button>
                  </div>
                </div>

                {/* 2. Visual Viewport with CCTV HUD & Controls */}
                <div className="tile-visual">
                  <CCTVCanvasStream
                    cameraId={cam.id}
                    cameraName={cam.name}
                    count={currentCount}
                    resolution={cam.resolution}
                    fps={cam.fps}
                    latencyMs={cam.latencyMs}
                    heatmap={heatmap}
                    flowVectors={flowVectors}
                    sceneType={cam.scene}
                    streamType={cam.streamType}
                    isWebcam={isWb}
                    zoneId={cam.zoneId}
                    height={layout === '1x1' ? 420 : layout === '2x2' ? 240 : 190}
                    streamUrl={cam.streamUrl}
                    snapshotUrl={cam.lastSnapshot || cam.snapshotUrl || cam.lastDetection?.imageSrc || (cam.id === 'CAM-01' ? latestDetection?.imageSrc : null)}
                    lastSnapshot={cam.lastSnapshot || (cam.id === 'CAM-01' ? latestDetection?.imageSrc : null)}
                    heatmapUrl={cam.heatmapUrl || cam.lastDetection?.heatmapUrl || (cam.id === 'CAM-01' ? latestDetection?.heatmapUrl : null)}
                    onSnapshot={handleSnapshot}
                    onCountChange={(cnt) => handleCameraCountChange(cam.id, cnt)}
                  />
                </div>

                {/* 3. Real-Time Capacity Level Track */}
                <div className="cctv-bar-track">
                  <div
                    className={`cctv-bar-fill ${isCritical ? 'crit' : isWarning ? 'warn' : 'ok'}`}
                    style={{ width: `${Math.min(100, Math.max(4, currentCapacity))}%` }}
                  />
                </div>

                {/* 4. Telemetry Micro-Cards (Footer Grid) */}
                <div className="tile-footer-grid">
                  <div className="telemetry-chip">
                    <span className="telemetry-label">👥 Headcount</span>
                    <span className="telemetry-val headcount-val">
                      {currentCount} <small>people</small>
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">⚡ AI Latency</span>
                    <span className="telemetry-val">
                      {cam.latencyMs || 35} <small>ms</small>
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">📐 Resolution</span>
                    <span className="telemetry-val">
                      {cam.resolution || '1080p'} · {cam.fps || 30} FPS
                    </span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">🏢 Assigned Zone</span>
                    <span className="telemetry-val zone-val" title={cam.zone}>
                      {cam.zone || 'Concourse'}
                    </span>
                  </div>
                </div>

                {/* 5. Tile Action Toolbar */}
                <div className="tile-action-bar">
                  <div className="feed-status-indicator">
                    <span className="status-ping" />
                    <span>FEED ONLINE · CSRNET ACTIVE</span>
                  </div>
                  <div className="tile-action-buttons">
                    <button
                      className="tile-action-btn"
                      title="Send current frame to Crowd Search AI Sandbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        inspectInCrowdSearch(cam.lastSnapshot || cam.snapshotUrl || '/samples/mall_concourse.jpg', cam.zoneId);
                      }}
                    >
                      📷 Inspect AI
                    </button>
                    <button
                      className={`tile-action-btn ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCameraId(cam.id);
                      }}
                    >
                      {isSelected ? '✓ In Focus' : 'Select Feed'}
                    </button>
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

          {(() => {
            const selectedCount = liveCounts[selectedCam.id] !== undefined ? liveCounts[selectedCam.id] : (selectedCam.count || 0);
            const selMax = selectedCam.maxCapacity || 200;
            const selectedCapacity = Math.min(100, Math.round((selectedCount / selMax) * 100));

            return (
              <div className="telemetry-card">
                <div className="metric-row">
                  <span>Assigned Zone</span>
                  <b>{selectedCam.zone}</b>
                </div>
                <div className="metric-row">
                  <span>Current Crowd Count</span>
                  <b style={{ color: '#38bdf8', fontSize: '16px', fontWeight: 800 }}>{selectedCount} persons</b>
                </div>
                <div className="metric-row">
                  <span>Zone Capacity Status</span>
                  <b className={selectedCapacity > 85 ? 'text-red' : selectedCapacity > 70 ? 'text-amber' : 'text-green'}>
                    {selectedCapacity}% ({selectedCount}/{selMax})
                  </b>
                </div>
                <div className="progress-track" style={{ marginTop: '8px', marginBottom: '14px' }}>
                  <div
                    className={`progress-fill ${selectedCapacity > 85 ? 'critical' : selectedCapacity > 70 ? 'warning' : 'normal'}`}
                    style={{ width: `${Math.min(100, Math.max(4, selectedCapacity))}%` }}
                  />
                </div>
              </div>
            );
          })()}

          <div className="telemetry-card">
            <h3>AI Inference Telemetry</h3>
            <div className="metric-row">
              <span>AI Service Status</span>
              <b style={{ color: aiConnected ? '#19a779' : '#e05555' }}>
                {aiConnected ? '✓ Online' : '⚠ Offline — AI not running'}
              </b>
            </div>
            <div className="metric-row">
              <span>Active Model</span>
              <b>{aiConnected ? (aiModelInfo || 'CSRNet Dilated (PyTorch)') : '—'}</b>
            </div>
            <div className="metric-row">
              <span>Inference Time</span>
              <b>{aiConnected && latestDetection ? `${latestDetection.latencyMs} ms` : (aiConnected ? `${selectedCam.latencyMs} ms` : '—')}</b>
            </div>
            <div className="metric-row">
              <span>Peak Crowd Density</span>
              <b>{aiConnected ? '0.92 heads/m²' : '— (AI offline)'}</b>
            </div>
            <div className="metric-row">
              <span>Uncertainty (σ)</span>
              <b>{aiConnected ? '± 3.4 heads' : '—'}</b>
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
              <b>{aiConnected ? '1.42 px/frame' : '— (AI offline)'}</b>
            </div>
            <div className="metric-row">
              <span>Dominant Vector</span>
              <b>{aiConnected ? 'East-Southeast (52°)' : '—'}</b>
            </div>
            <div className="metric-row">
              <span>Turbulence Index</span>
              <b style={{ color: aiConnected ? '#27b383' : 'var(--muted)' }}>
                {aiConnected ? 'Low (0.18)' : '—'}
              </b>
            </div>
          </div>

          {(selectedCam.lastSnapshot || latestDetection?.imageSrc) && (
            <div className="telemetry-card" style={{ padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#19a779' }}>● MONGODB STORED FRAME</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Indefinitely Persisted</span>
              </div>
              <img
                src={selectedCam.lastSnapshot || latestDetection?.imageSrc}
                alt="Captured CCTV Frame"
                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          )}

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
