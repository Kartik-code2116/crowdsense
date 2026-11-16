import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import CCTVCanvasStream from '../components/CCTVCanvasStream';

export default function CamerasView() {
  const {
    cameras,
    zones,
    setCameraModel,
    deleteCamera,
    toggleWebcamFeed,
    setShowAddCameraModal,
    setActiveCameraId,
    setPage,
    heatmap,
    flowVectors
  } = useCrowdStore();

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [actionMessage, setActionMessage] = useState('');
  const [busyCameraId, setBusyCameraId] = useState('');
  const isWebcamAdded = cameras.some((c) => c.id === 'CAM-WEBCAM');

  const handleWebcamToggle = async () => {
    setActionMessage('');
    const result = await toggleWebcamFeed();
    if (!result?.success) setActionMessage(result?.message || 'Could not update the laptop camera.');
  };

  const handleModelChange = async (camera, modelType) => {
    setBusyCameraId(camera.id);
    setActionMessage('');
    const result = await setCameraModel(camera.id, modelType);
    setActionMessage(result?.success ? `${camera.name}: ${modelType.toUpperCase()} saved.` : result?.message || 'Could not save the camera model.');
    setBusyCameraId('');
  };

  const handleRemoveCamera = async (camera) => {
    if (!window.confirm(`Remove ${camera.name}?`)) return;
    setBusyCameraId(camera.id);
    setActionMessage('');
    const result = await deleteCamera(camera.id);
    setActionMessage(result?.success ? `${camera.name} removed.` : result?.message || 'Could not remove the camera.');
    setBusyCameraId('');
  };

  const handleViewLive = (camId) => {
    setActiveCameraId(camId);
    setPage('Live monitor');
  };

  return (
    <div className="cameras-view-container">
      <div className="page-action-row">
        <div>
          <h2>Camera sources ({cameras.length})</h2>
          <p>Manage camera sources, zone links, and each camera’s assigned inference model</p>
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
              ▦ Preview Grid
            </button>
          </div>
          <button
            className={`button ${isWebcamAdded ? 'secondary' : 'primary'}`}
            onClick={handleWebcamToggle}
            disabled={!zones.length && !isWebcamAdded}
            title={!zones.length && !isWebcamAdded ? 'Create a zone first' : 'Add or remove the laptop webcam'}
          >
            {isWebcamAdded ? '✓ Laptop Webcam Active' : '📹 Add Laptop Webcam'}
          </button>
          <button className="button primary" onClick={() => setShowAddCameraModal(true)}>
            + Register New Camera
          </button>
        </div>
      </div>
      {actionMessage && <div role="status" className="diagnostic-note" style={{ marginTop: 12 }}>{actionMessage}</div>}

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
                    <span className={`status-dot ${cam.status === 'Live' ? 'green' : cam.status === 'Degraded' ? 'red' : 'amber'}`} title={cam.status || 'Pending'} />
                    <span className="cctv-badge-id">{cam.id}</span>
                    {isYt && <span className="cctv-badge-yt">Video platform</span>}
                    {isWb && <span className="cctv-badge-wb">📹 Webcam</span>}
                    {isNet && <span className="cctv-badge-rtsp">🌐 RTSP IP</span>}
                    {!isYt && !isWb && !isNet && <span className="cctv-badge-demo">⚡ Edge Stream</span>}
                    <span className="cctv-tile-name" title={cam.name}>{cam.name}</span>
                  </div>

                  <div className="tile-header-right">
                    <span className={`cctv-cap-badge ${cam.status === 'Live' ? (isCritical ? 'crit' : isWarning ? 'warn' : 'ok') : ''}`}>
                      <i className="status-dot" /> {cam.status === 'Live' ? `${cam.capacity || 0}% Cap` : cam.status || 'Pending'}
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
                    cameraStatus={cam.status}
                    modelType={cam.modelType}
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
                    <span className="telemetry-val headcount-val">{cam.status === 'Live' ? cam.count : '—'} <small>{cam.status === 'Live' ? 'people' : ''}</small></span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">⚡ AI Latency</span>
                    <span className="telemetry-val">{cam.latencyMs > 0 ? <>{cam.latencyMs} <small>ms</small></> : '—'}</span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">📐 Resolution</span>
                    <span className="telemetry-val">{cam.resolution || 'Not reported'}</span>
                  </div>
                  <div className="telemetry-chip">
                    <span className="telemetry-label">🏢 Location</span>
                    <span className="telemetry-val zone-val">{cam.zoneName || cam.zone || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="tile-action-bar">
                  <div className="feed-status-indicator">
                    <span className={`status-dot ${cam.status === 'Live' ? 'green' : cam.status === 'Degraded' ? 'red' : 'amber'}`} />
                    <span>{cam.status || 'Pending'} · {cam.status === 'Live' ? 'last AI sample succeeded' : 'waiting for a successful sample'}</span>
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
                <th>LINKED SAFETY ZONE</th>
                <th>SPATIAL MAP PIN</th>
                <th>STREAM SOURCE &amp; TYPE</th>
                <th>LIVE DETECTION</th>
                <th>AI MODEL</th>
                <th>RESOLUTION</th>
                <th>FPS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {!cameras.length ? (
                <tr><td colSpan="10" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>No cameras configured. Create a zone with a capacity ceiling, then add a camera source. <button className="button primary" onClick={() => setPage('Zones')}>Set up zones</button></td></tr>
              ) : cameras.map((cam) => {
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
                    <td>
                      <b>{cam.zoneName || cam.zone}</b>
                      <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10.5px' }}>
                        Ceiling: {cam.maxCapacity || '—'} people
                      </small>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', color: '#00ffcc', fontWeight: '700' }}>
                        {cam.mapPin ? `📍 (${cam.mapPin.x}%, ${cam.mapPin.y}%)` : 'Not mapped'}
                      </span>
                      <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>
                        {cam.mapPin?.bearing ? `Facing: ${cam.mapPin.bearing}` : 'No bearing configured'}
                      </small>
                    </td>
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
                          {isYt ? 'VIDEO PLATFORM' : isWb ? '📹 LAPTOP WEBCAM' : '🔗 NETWORK / VIDEO FEED'}
                        </span>
                        <code style={{ fontSize: '11px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cam.streamUrl}>
                          {cam.streamUrl || 'No source configured'}
                        </code>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#00ffcc' }}>{cam.status === 'Live' ? (cam.count || 0) : '—'}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>people</span>
                        <span
                          className={`incident-status ${isCritical ? 'red' : isWarning ? 'amber' : 'green'}`}
                          style={{ display: 'inline-block', marginLeft: '6px', fontSize: '9.5px', padding: '1px 6px' }}
                        >
                          {cam.status === 'Live' ? `${cam.capacity || 0}%` : cam.status || 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select className="select-input" value={cam.modelType || 'csrnet'} disabled={busyCameraId === cam.id} onChange={(e) => handleModelChange(cam, e.target.value)} aria-label={`Model for ${cam.name}`} style={{ minWidth: '125px', padding: '5px', fontSize: '11px' }}>
                        <option value="csrnet">CSRNet</option>
                        <option value="yolov8">YOLOv8</option>
                      </select>
                    </td>
                    <td>{cam.resolution || '—'}</td>
                    <td>{cam.fps ? `${cam.fps} configured` : '—'}</td>
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
                          onClick={() => handleRemoveCamera(cam)}
                          disabled={busyCameraId === cam.id}
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
