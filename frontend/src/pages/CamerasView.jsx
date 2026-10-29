import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import CCTVCanvasStream from '../components/CCTVCanvasStream';

export default function CamerasView() {
  const {
    cameras,
    deleteCamera,
    toggleWebcamFeed,
    setShowAddCameraModal,
    setActiveCameraId,
    setPage,
    heatmap,
    flowVectors
  } = useCrowdStore();

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const isWebcamAdded = cameras.some((c) => c.id === 'CAM-WEBCAM');

  const handleViewLive = (camId) => {
    setActiveCameraId(camId);
    setPage('Live monitor');
  };

  return (
    <div className="cameras-view-container">
      <div className="page-action-row">
        <div>
          <h2>Connected Venue Edge Cameras ({cameras.length})</h2>
          <p>YouTube live streams, hardware webcams & RTSP edge feeds with continuous CSRNet density regression</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="layout-picker" style={{ display: 'flex' }}>
            <button
              type="button"
              className={`layout-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              ☰ Table View
            </button>
            <button
              type="button"
              className={`layout-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ▦ Live Video Grid
            </button>
          </div>
          <button
            className={`button ${isWebcamAdded ? 'secondary' : 'primary'}`}
            onClick={toggleWebcamFeed}
          >
            {isWebcamAdded ? '✓ Laptop Webcam Active' : '📹 Add Laptop Webcam'}
          </button>
          <button className="button primary" onClick={() => setShowAddCameraModal(true)}>
            + Register New Camera
          </button>
        </div>
      </div>

      {/* Grid Mode: Live Footage Preview for all cameras */}
      {viewMode === 'grid' && (
        <div className="monitor-grid grid-2x2" style={{ marginTop: '16px' }}>
          {cameras.map((cam) => {
            const isCritical = cam.capacity >= 85;
            const isWarning = cam.capacity >= 70 && !isCritical;

            const isYt = cam.streamType === 'youtube' || (cam.streamUrl && (cam.streamUrl.includes('youtube') || cam.streamUrl.includes('youtu.be')));
            const isWb = cam.streamType === 'webcam' || cam.isWebcam || cam.id === 'CAM-WEBCAM' || (cam.streamUrl && cam.streamUrl.includes('webcam'));
            const isNet = cam.streamType === 'url' || (cam.streamUrl && cam.streamUrl.startsWith('http') && !isYt);

            return (
              <div key={cam.id} className="monitor-tile">
                <div className="tile-header">
                  <div className="tile-header-left">
                    <span className="cctv-rec-dot" title="Live Stream Active" />
                    <span className="cctv-badge-id">{cam.id}</span>
                    {isYt && <span className="cctv-badge-yt">🔴 YouTube Live</span>}
                    {isWb && <span className="cctv-badge-wb">📹 Webcam</span>}
                    {isNet && <span className="cctv-badge-rtsp">🌐 RTSP IP</span>}
                    {!isYt && !isWb && !isNet && <span className="cctv-badge-demo">⚡ Edge Stream</span>}
                    <span className="cctv-tile-name" title={cam.name}>{cam.name}</span>
                  </div>

                  <div className="tile-header-right">
                    <span className={`cctv-cap-badge ${isCritical ? 'crit' : isWarning ? 'warn' : 'ok'}`}>
                      <i className="status-dot" /> {cam.capacity || 0}% Cap
                    </span>
                  </div>
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
                    streamType={cam.streamType}
                    streamUrl={cam.streamUrl}
                    height={220}
                    isWebcam={isWb}
                    snapshotUrl={cam.lastSnapshot || cam.snapshotUrl}
                    heatmapUrl={cam.heatmapUrl}
                    zoneId={cam.zoneId}
                  />
                </div>

                <div className="cctv-bar-track">
                  <div
                    className={`cctv-bar-fill ${isCritical ? 'crit' : isWarning ? 'warn' : 'ok'}`}
                    style={{ width: `${Math.min(100, Math.max(4, cam.capacity || 0))}%` }}
                  />
                </div>

                <div className="tile-footer-grid">
                  <div className="telemetry-chip">
                    <span className="telemetry-label">👥 Headcount</span>
                    <span className="telemetry-val headcount-val">{cam.count} <small>people</small></span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">⚡ AI Latency</span>
                    <span className="telemetry-val">{cam.latencyMs || 35} <small>ms</small></span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">📐 Resolution</span>
                    <span className="telemetry-val">{cam.resolution || '1080p'}</span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">🏢 Location</span>
                    <span className="telemetry-val zone-val">{cam.zone || 'Concourse'}</span>
                  </div>
                </div>

                <div className="tile-action-bar">
                  <div className="feed-status-indicator">
                    <span className="status-ping" />
                    <span>FEED SYNCHRONIZED</span>
                  </div>
                  <button
                    className="tile-action-btn active"
                    style={{ fontSize: '11.5px', padding: '5px 12px' }}
                    onClick={() => handleViewLive(cam.id)}
                  >
                    🎥 Focus Live Monitor →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Mode */}
      {viewMode === 'table' && (
        <div className="panel" style={{ marginTop: '16px' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>CAMERA NAME</th>
                <th>ASSIGNED ZONE</th>
                <th>STREAM SOURCE &amp; TYPE</th>
                <th>LIVE DETECTION</th>
                <th>RESOLUTION</th>
                <th>FPS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((cam) => {
                const isYt = cam.streamType === 'youtube' || (cam.streamUrl && cam.streamUrl.includes('youtu'));
                const isWb = cam.streamType === 'webcam' || cam.id === 'CAM-WEBCAM' || (cam.streamUrl && cam.streamUrl.includes('webcam'));
                const isCritical = (cam.capacity || 0) >= 85;
                const isWarning = (cam.capacity || 0) >= 70 && !isCritical;

                return (
                  <tr key={cam.id}>
                    <td>
                      <b>{cam.name}</b>
                      <small style={{ display: 'block', color: 'var(--muted)', fontFamily: 'monospace' }}>{cam.id}</small>
                    </td>
                    <td>{cam.zone}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isYt ? '#ff3344' : isWb ? '#00ffcc' : 'var(--accent-teal)'
                          }}
                        >
                          {isYt ? '🌐 YOUTUBE LIVE' : isWb ? '📹 LAPTOP WEBCAM' : '🔗 RTSP / VIDEO FEED'}
                        </span>
                        <code style={{ fontSize: '11px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cam.streamUrl}>
                          {cam.streamUrl || 'demo://sample'}
                        </code>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#00ffcc' }}>{cam.count || 0}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>people</span>
                        <span
                          className={`incident-status ${isCritical ? 'red' : isWarning ? 'amber' : 'green'}`}
                          style={{ display: 'inline-block', marginLeft: '6px', fontSize: '9.5px', padding: '1px 6px' }}
                        >
                          {cam.capacity || 0}%
                        </span>
                      </div>
                    </td>
                    <td>{cam.resolution}</td>
                    <td>{cam.fps} FPS</td>
                    <td>
                      <span className="live-pill" style={{ display: 'inline-flex' }}>
                        <i /> {cam.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="button primary"
                          style={{ height: '30px', fontSize: '11.5px', padding: '0 10px' }}
                          onClick={() => handleViewLive(cam.id)}
                        >
                          🎥 View Live
                        </button>
                        <button
                          className="button secondary"
                          style={{ height: '30px', fontSize: '11.5px', padding: '0 10px', color: '#ff3344' }}
                          onClick={() => deleteCamera(cam.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
