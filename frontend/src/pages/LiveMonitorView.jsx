import React, { useState, useMemo } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import CCTVCanvasStream from '../components/CCTVCanvasStream';
import VenueSpatialMap from '../components/VenueSpatialMap';
import {
  Video,
  Radio,
  Layers,
  MapPin,
  Maximize2,
  Grid,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Laptop,
  Globe,
  Sliders,
  ChevronRight
} from 'lucide-react';

export default function LiveMonitorView() {
  const {
    cameras,
    zones,
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

  const [layout, setLayout] = useState('2x2'); // '1x1' | '2x2' | '3x3' | 'zone-grouped'
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'youtube' | 'webcam' | 'url' | 'demo'
  const [showMapHUD, setShowMapHUD] = useState(false);
  const [liveCounts, setLiveCounts] = useState({});

  const isWebcamLive = cameras.some((c) => c.id === 'CAM-WEBCAM');
  const selectedCam = cameras.find((c) => c.id === activeCameraId) || cameras[0] || {};

  const handleCameraCountChange = (camId, cnt) => {
    setLiveCounts((prev) => ({ ...prev, [camId]: cnt }));
  };

  // Filter cameras by stream type
  const filteredCameras = useMemo(() => {
    if (streamFilter === 'all') return cameras;
    return cameras.filter((c) => {
      const isYt = c.streamType === 'youtube' || c.streamUrl?.includes('youtube');
      const isWb = c.streamType === 'webcam' || c.id === 'CAM-WEBCAM' || c.isWebcam;
      const isNet = c.streamType === 'url' || (c.streamUrl?.startsWith('http') && !isYt);
      const isDemo = c.streamType === 'demo' || (!isYt && !isWb && !isNet);

      if (streamFilter === 'youtube') return isYt;
      if (streamFilter === 'webcam') return isWb;
      if (streamFilter === 'url') return isNet;
      if (streamFilter === 'demo') return isDemo;
      return true;
    });
  }, [cameras, streamFilter]);

  // Counts by category
  const ytCount = cameras.filter((c) => c.streamType === 'youtube' || c.streamUrl?.includes('youtube')).length;
  const wbCount = cameras.filter((c) => c.streamType === 'webcam' || c.id === 'CAM-WEBCAM' || c.isWebcam).length;
  const rtspCount = cameras.filter((c) => c.streamType === 'url' || (c.streamUrl?.startsWith('http') && !c.streamUrl?.includes('youtube'))).length;
  const demoCount = cameras.filter((c) => c.streamType === 'demo' || (!c.streamUrl?.includes('youtube') && c.id !== 'CAM-WEBCAM' && !c.streamUrl?.startsWith('http'))).length;

  const displayedCameras = layout === '1x1'
    ? [selectedCam]
    : layout === '2x2'
    ? filteredCameras.slice(0, 4)
    : filteredCameras;

  const handleSnapshot = (dataUrl) => {
    inspectInCrowdSearch(dataUrl, selectedCam?.zoneId);
  };

  // Helper to render individual camera tile with differentiated category styling
  const renderCameraTile = (cam) => {
    const currentCount = liveCounts[cam.id] !== undefined ? liveCounts[cam.id] : (cam.count || 0);
    const maxCap = cam.maxCapacity || 200;
    const currentCapacity = Math.min(100, Math.round((currentCount / maxCap) * 100));
    const isCritical = currentCapacity >= 85;
    const isWarning = currentCapacity >= 70 && !isCritical;
    const isSelected = selectedCam.id === cam.id;

    const isYt = cam.streamType === 'youtube' || (cam.streamUrl && (cam.streamUrl.includes('youtube') || cam.streamUrl.includes('youtu.be')));
    const isWb = cam.streamType === 'webcam' || cam.isWebcam || cam.id === 'CAM-WEBCAM' || (cam.streamUrl && cam.streamUrl.includes('webcam'));
    const isNet = cam.streamType === 'url' || (cam.streamUrl && cam.streamUrl.startsWith('http') && !isYt);

    // Differentiated border and accent styling by feed type
    const categoryBorder = isYt
      ? 'rgba(239, 68, 68, 0.45)'
      : isWb
      ? 'rgba(0, 255, 204, 0.45)'
      : isNet
      ? 'rgba(168, 85, 247, 0.45)'
      : 'rgba(56, 189, 248, 0.35)';

    const categoryAccent = isYt
      ? '#ef4444'
      : isWb
      ? '#00ffcc'
      : isNet
      ? '#a855f7'
      : '#38bdf8';

    return (
      <div
        key={cam.id}
        className={`monitor-tile ${isSelected ? 'active-tile' : ''}`}
        style={{
          border: isSelected ? `2px solid ${categoryAccent}` : `1px solid ${categoryBorder}`,
          boxShadow: isSelected ? `0 0 16px ${categoryAccent}33` : 'none'
        }}
        onClick={() => setActiveCameraId(cam.id)}
      >
        {/* 1. Header with live REC dot, source badge, name, capacity, and focus button */}
        <div className="tile-header">
          <div className="tile-header-left">
            <span className="cctv-rec-dot" style={{ background: categoryAccent }} title="Live Stream Active" />
            <span className="cctv-badge-id">{cam.id}</span>
            {isYt && <span className="cctv-badge-yt">🔴 YouTube Live</span>}
            {isWb && <span className="cctv-badge-wb">📹 Laptop Webcam</span>}
            {isNet && <span className="cctv-badge-rtsp">🌐 RTSP IP Feed</span>}
            {!isYt && !isWb && !isNet && <span className="cctv-badge-demo">⚡ Edge Benchmark</span>}
            <span className="cctv-tile-name" title={cam.name}>{cam.name}</span>
          </div>

          <div className="tile-header-right">
            <span className={`cctv-cap-badge ${isCritical ? 'crit' : isWarning ? 'warn' : 'ok'}`}>
              <i className="status-dot" /> {aiConnected ? `${currentCapacity}% Cap` : '—% Cap'}
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
            height={layout === '1x1' ? 440 : layout === '2x2' ? 240 : 190}
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
            style={{ width: `${aiConnected ? Math.min(100, Math.max(4, currentCapacity)) : 0}%` }}
          />
        </div>

        {/* 4. Telemetry Micro-Cards (Footer Grid) */}
        <div className="tile-footer-grid">
          <div className="telemetry-chip">
            <span className="telemetry-label">👥 Headcount</span>
            <span className="telemetry-val headcount-val">
              {aiConnected ? currentCount : '—'} <small>people</small>
            </span>
          </div>
          <div className="telemetry-chip">
            <span className="telemetry-label">⚡ AI Latency</span>
            <span className="telemetry-val">
              {aiConnected ? <>{cam.latencyMs || 35} <small>ms</small></> : '— ms'}
            </span>
          </div>
          <div className="telemetry-chip">
            <span className="telemetry-label">📐 Resolution</span>
            <span className="telemetry-val">
              {cam.resolution || '1080p'} · {cam.fps || 30} FPS
            </span>
          </div>
          <div className="telemetry-chip">
            <span className="telemetry-label">🏢 Linked Zone</span>
            <span className="telemetry-val zone-val" title={cam.zoneName || cam.zone}>
              {cam.zoneName || cam.zone || 'Concourse'}
            </span>
          </div>
        </div>

        {/* 5. Tile Action Toolbar */}
        <div className="tile-action-bar">
          <div className="feed-status-indicator">
            <span className="status-ping" style={{ background: aiConnected ? categoryAccent : '#e05555' }} />
            <span style={{ color: aiConnected ? undefined : '#e05555' }}>
              {aiConnected ? `${cam.streamType?.toUpperCase() || 'STREAM'} ACTIVE · CSRNET RUNNING` : '⚠ DETECTION PAUSED · AI SERVICE OFFLINE'}
            </span>
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
  };

  return (
    <div className="live-monitor-container">
      {/* Top Controls Toolbar with Category Filters & Structure Switchers */}
      <div className="monitor-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="live-badge">● LIVE MULTI-MONITOR</span>
          <span className="toolbar-divider" />
          <span className="active-count">{filteredCameras.length} active edge feeds</span>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Stream Type Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-soft)', padding: '3px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <button
              className={`pill-btn ${streamFilter === 'all' ? 'active' : ''}`}
              style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setStreamFilter('all')}
            >
              All ({cameras.length})
            </button>
            <button
              className={`pill-btn ${streamFilter === 'youtube' ? 'active' : ''}`}
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', color: streamFilter === 'youtube' ? '#fff' : '#ef4444' }}
              onClick={() => setStreamFilter('youtube')}
            >
              🔴 YouTube ({ytCount})
            </button>
            <button
              className={`pill-btn ${streamFilter === 'webcam' ? 'active' : ''}`}
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', color: streamFilter === 'webcam' ? '#fff' : '#00ffcc' }}
              onClick={() => setStreamFilter('webcam')}
            >
              📹 Webcams ({wbCount})
            </button>
            <button
              className={`pill-btn ${streamFilter === 'url' ? 'active' : ''}`}
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', color: streamFilter === 'url' ? '#fff' : '#a855f7' }}
              onClick={() => setStreamFilter('url')}
            >
              🌐 RTSP IP ({rtspCount})
            </button>
            <button
              className={`pill-btn ${streamFilter === 'demo' ? 'active' : ''}`}
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', color: streamFilter === 'demo' ? '#fff' : '#38bdf8' }}
              onClick={() => setStreamFilter('demo')}
            >
              ⚡ Edge Datasets ({demoCount})
            </button>
          </div>

          {/* Structural Layout Switches */}
          <div className="layout-picker">
            <button className={`layout-btn ${layout === '1x1' ? 'active' : ''}`} onClick={() => setLayout('1x1')}>
              1×1 Focus
            </button>
            <button className={`layout-btn ${layout === '2x2' ? 'active' : ''}`} onClick={() => setLayout('2x2')}>
              2×2 Quad
            </button>
            <button className={`layout-btn ${layout === 'zone-grouped' ? 'active' : ''}`} onClick={() => setLayout('zone-grouped')}>
              🏢 By Safety Zone
            </button>
          </div>

          {/* Toggle Spatial Map Overlay */}
          <button
            className={`toggle-chip ${showMapHUD ? 'selected' : ''}`}
            onClick={() => setShowMapHUD(!showMapHUD)}
            title="Toggle interactive venue spatial map overlay"
          >
            <MapPin size={13} /> Venue Map HUD
            <span className={`switch ${showMapHUD ? 'on' : ''}`}><i /></span>
          </button>

          <button
            className={`toggle-chip ${isWebcamLive ? 'selected' : ''}`}
            onClick={toggleWebcamFeed}
            title="Toggle laptop integrated webcam"
          >
            <Laptop size={13} /> Laptop Camera
            <span className={`switch ${isWebcamLive ? 'on' : ''}`}><i /></span>
          </button>

          <button
            className={`toggle-chip ${heatmap ? 'selected' : ''}`}
            onClick={() => setHeatmap(!heatmap)}
          >
            <span className="heat-icon">▧</span> Heatmap
            <span className={`switch ${heatmap ? 'on' : ''}`}><i /></span>
          </button>

          <button
            className="button primary"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
            onClick={() => setShowAddCameraModal(true)}
          >
            + Add Stream
          </button>
        </div>
      </div>

      {/* OPTIONAL EXPANDING INTERACTIVE VENUE SPATIAL MAP HUD */}
      {showMapHUD && (
        <div style={{ marginBottom: '14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="#00ffcc" />
              <strong style={{ fontSize: '13px' }}>Venue Spatial Topology &amp; Camera Placements</strong>
              <small style={{ color: 'var(--muted)' }}>Click any camera pin to focus its live feed</small>
            </div>
            <button
              className="button secondary"
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setShowMapHUD(false)}
            >
              ✕ Close Map HUD
            </button>
          </div>

          <VenueSpatialMap
            mode="view"
            zones={zones}
            cameras={cameras}
            activeCameraId={selectedCam.id}
            height={200}
            showControls={true}
            onSelectCamera={(cam) => {
              setActiveCameraId(cam.id);
            }}
          />
        </div>
      )}

      <div className="monitor-main-split">
        {/* STRUCTURAL VIEW MODE A: GROUPED BY SAFETY ZONE */}
        {layout === 'zone-grouped' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {zones.map((zone) => {
              const zoneCams = filteredCameras.filter((c) => c.zoneId === zone.id);
              if (zoneCams.length === 0 && streamFilter !== 'all') return null;

              const totalZoneCount = zoneCams.reduce((sum, c) => sum + (liveCounts[c.id] || c.count || 0), 0);
              const occPct = Math.round((totalZoneCount / zone.maxCapacity) * 100);
              const isCrit = occPct >= zone.criticalPct;
              const isWarn = occPct >= zone.warningPct && !isCrit;

              return (
                <section
                  key={zone.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Zone Header with Ceiling Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="zone-code">{zone.code}</span>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>{zone.name}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({zone.floor || 'Level 1'})</span>
                      <span style={{ fontSize: '11px', background: 'var(--surface-soft)', padding: '2px 8px', borderRadius: '4px', color: '#38bdf8' }}>
                        {zoneCams.length} Linked Camera{zoneCams.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text)' }}>
                        {aiConnected ? totalZoneCount : '—'} / {zone.maxCapacity} people
                      </span>
                      <span className={`cctv-cap-badge ${isCrit ? 'crit' : isWarn ? 'warn' : 'ok'}`}>
                        {aiConnected ? `${occPct}% Ceiling` : '—%'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-track" style={{ height: '6px', margin: 0 }}>
                    <div
                      className={`progress-fill ${isCrit ? 'critical' : isWarn ? 'warning' : 'normal'}`}
                      style={{ width: `${aiConnected ? Math.min(100, Math.max(3, occPct)) : 0}%` }}
                    />
                  </div>

                  {/* Cameras inside this Zone */}
                  {zoneCams.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px', background: 'var(--surface-soft)', borderRadius: '6px' }}>
                      No active camera feeds currently matching filter inside {zone.name}.
                    </div>
                  ) : (
                    <div className="monitor-grid grid-2x2">
                      {zoneCams.map((cam) => renderCameraTile(cam))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          /* STRUCTURAL VIEW MODE B: STANDARD GRID (1x1, 2x2, ALL) */
          <div className={`monitor-grid grid-${layout}`}>
            {displayedCameras.map((cam) => renderCameraTile(cam))}
          </div>
        )}

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
                  <span>Parent Zone</span>
                  <b>{selectedCam.zoneName || selectedCam.zone}</b>
                </div>
                <div className="metric-row">
                  <span>Current Headcount</span>
                  <b style={{ color: '#38bdf8', fontSize: '16px', fontWeight: 800 }}>
                    {aiConnected ? `${selectedCount} persons` : '— (AI Offline)'}
                  </b>
                </div>
                <div className="metric-row">
                  <span>Zone Safety Capacity</span>
                  <b className={selectedCapacity > 85 ? 'text-red' : selectedCapacity > 70 ? 'text-amber' : 'text-green'}>
                    {aiConnected ? `${selectedCapacity}% (${selectedCount}/${selMax})` : '—'}
                  </b>
                </div>
                <div className="progress-track" style={{ marginTop: '8px', marginBottom: '14px' }}>
                  <div
                    className={`progress-fill ${selectedCapacity > 85 ? 'critical' : selectedCapacity > 70 ? 'warning' : 'normal'}`}
                    style={{ width: `${aiConnected ? Math.min(100, Math.max(4, selectedCapacity)) : 0}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Hardware & Stream Profile */}
          <div className="telemetry-card">
            <h3>Stream Profile &amp; Protocol</h3>
            <div className="metric-row">
              <span>Stream Ingestion</span>
              <b style={{ textTransform: 'uppercase', color: selectedCam.streamType === 'youtube' ? '#ef4444' : selectedCam.streamType === 'webcam' ? '#00ffcc' : '#38bdf8' }}>
                {selectedCam.streamType || 'CCTV Feed'}
              </b>
            </div>
            <div className="metric-row">
              <span>Resolution &amp; Rate</span>
              <b>{selectedCam.resolution || '1080p'} @ {selectedCam.fps || 2.0} FPS</b>
            </div>
            <div className="metric-row">
              <span>Spatial Map Pin</span>
              <b>
                {selectedCam.mapPin
                  ? `(${selectedCam.mapPin.x}%, ${selectedCam.mapPin.y}%) • ${selectedCam.mapPin.bearing || 'South'}`
                  : 'Sector Concourse'}
              </b>
            </div>
          </div>

          <div className="telemetry-card">
            <h3>AI Inference Telemetry</h3>
            <div className="metric-row">
              <span>AI Service Status</span>
              <b style={{ color: aiConnected ? '#19a779' : '#e05555' }}>
                {aiConnected ? '✓ Online' : '⚠ Offline — AI not running'}
              </b>
            </div>
            <div className="metric-row">
              <span>Active DL Backbone</span>
              <b>{aiConnected ? (aiModelInfo || 'CSRNet Dilated Conv') : '—'}</b>
            </div>
            <div className="metric-row">
              <span>Inference Time</span>
              <b>
                {aiConnected && latestDetection
                  ? `${latestDetection.latencyMs} ms`
                  : aiConnected
                  ? `${selectedCam.latencyMs || 38} ms`
                  : '—'}
              </b>
            </div>
          </div>

          {(selectedCam.lastSnapshot || latestDetection?.imageSrc) && (
            <div className="telemetry-card" style={{ padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#19a779' }}>● MONGODB CAPTURED FRAME</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Persisted</span>
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
