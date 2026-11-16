import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import CCTVCanvasStream from '../components/CCTVCanvasStream';

function TrendLineChart({ totalCount = 0, range = 'Today', detectionLog = [] }) {
  const observations = detectionLog.slice(-7).map((entry) => Number(entry.count) || 0);
  if (!observations.length && totalCount > 0) observations.push(totalCount);
  const maxVal = Math.max(10, Math.round(Math.max(...observations, totalCount) * 1.3));
  const getY = (val) => Math.round(102 - (Math.max(0, val) / maxVal) * 82);
  const coords = observations.map((value, index) => ({
    x: observations.length === 1 ? 430 : 20 + (index / (observations.length - 1)) * 410,
    y: getY(value)
  }));
  const linePoints = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const areaPoints = coords.length ? `${coords[0].x},116 ${linePoints} ${coords[coords.length - 1].x},116` : '';

  return (
    <svg className="line-chart" viewBox="0 0 460 116" preserveAspectRatio="none" role="img" aria-label="Occupancy trend chart">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3478e5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3478e5" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {[20, 46, 72, 98].map((y) => (
        <line key={y} x1="0" y1={y} x2="460" y2={y} className="chart-grid" />
      ))}
      {coords.length > 1 && <polygon points={areaPoints} fill="url(#areaGradient)" />}
      {coords.length > 1 && <polyline points={linePoints} fill="none" className="chart-line" />}
      {coords.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === coords.length - 1 ? 4 : 3} fill="#3478e5" stroke="#fff" strokeWidth="2" />)}
    </svg>
  );
}

export default function DashboardView() {
  const {
    cameras,
    zones,
    incidents,
    range,
    setRange,
    heatmap,
    setHeatmap,
    flowVectors,
    setFlowVectors,
    setPage,
    setActiveCameraId,
    setSandboxSnapshot,
    setShowAddCameraModal,
    latestDetection,
    detectionLog,
    inspectInCrowdSearch,
    aiConnected
  } = useCrowdStore();

  const totalPeople = zones.length
    ? zones.reduce((sum, zone) => sum + (Number(zone.currentCount) || 0), 0)
    : Number(latestDetection?.zoneCount) || 0;

  const avgCapacity = zones.length > 0
    ? Math.round(zones.reduce((sum, z) => sum + (z.occupancyPct || 0), 0) / zones.length)
    : 0;

  const activeIncidentsCount = incidents.filter((i) => i.status === 'Open').length;
  const setupSteps = [
    { title: 'Set zone capacity', detail: `${zones.length} ${zones.length === 1 ? 'zone' : 'zones'} configured`, page: 'Zones' },
    { title: 'Add cameras to zones', detail: `${cameras.length} ${cameras.length === 1 ? 'camera' : 'cameras'} connected`, page: 'Cameras' },
    { title: 'Choose each camera model', detail: 'Assign in Cameras or compare in Models', page: 'Model lab' }
  ];

  const handleCameraSnapshot = (dataUrl) => {
    inspectInCrowdSearch(dataUrl);
  };

  // Determine honest offline state
  const isOfflineNoData = !aiConnected && totalPeople === 0 && detectionLog.length === 0;

  return (
    <div className="dashboard-content-wrapper">
      {/* AI Offline Warning Banner — shown when service is down and no cached data */}
      {!aiConnected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(90deg, rgba(224, 85, 85, 0.12), rgba(219, 146, 37, 0.08))',
          border: '1px solid #e05555',
          borderRadius: '8px',
          padding: '10px 18px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠</span>
          <div>
            <b style={{ fontSize: '13px', color: '#e05555' }}>AI Inference Service Unavailable</b>
            <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
              Camera scans cannot run until the AI service is available. Existing recorded observations remain visible.
            </small>
          </div>
        </div>
      )}

      <section className="panel" style={{ padding: '16px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px' }}>Set up your monitoring</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '12px' }}>Create zones and capacity limits, attach cameras, then assign a model to each camera.</p>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Zones → Cameras → Model per camera</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
          {setupSteps.map((step, index) => (
            <button key={step.title} className="button secondary" onClick={() => setPage(step.page)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', height: 'auto', padding: '10px 12px', textAlign: 'left' }}>
              <b style={{ fontSize: '12px' }}>{index + 1}. {step.title}</b>
              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>{step.detail}</small>
            </button>
          ))}
        </div>
      </section>

      {/* Live AI Crowd Detection Banner */}
      {latestDetection && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(39, 109, 224, 0.12), rgba(0, 255, 204, 0.08))',
          border: '1px solid #276de0',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '16px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="live-pill" style={{ background: '#276de0', color: '#fff', borderColor: '#276de0', fontWeight: '800' }}>
              LATEST OBSERVATION
            </span>
            <div>
              <b style={{ fontSize: '14px', color: 'var(--text)' }}>
                {latestDetection.count} {latestDetection.count === 1 ? 'person' : 'people'} observed in {latestDetection.zoneName || 'Venue Zone'}
              </b>
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                Via {latestDetection.modelName?.toUpperCase() || 'model unavailable'}{Number(latestDetection.latencyMs) > 0 ? ` · ${latestDetection.latencyMs}ms` : ''} · {latestDetection.timestamp}
              </small>
            </div>
          </div>
          <button
            className="button primary"
            style={{ height: '34px', fontSize: '12px', padding: '0 14px' }}
            onClick={() => setPage('Crowd search')}
          >
            🔍 Open in Crowd Search →
          </button>
        </div>
      )}

      {/* Top 4 Real-time Stat Cards */}
      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-top">
            <span>PEOPLE IN VENUE</span>
            <span className="stat-icon blue">♙</span>
          </div>
          <div className="stat-value">
            {isOfflineNoData ? '—' : totalPeople.toLocaleString()}{' '}
            <span className={`trend ${isOfflineNoData ? 'critical' : totalPeople > 0 ? 'positive' : 'stable'}`}>
              {isOfflineNoData
                ? '⚠ AI Model Offline'
                : latestDetection
                ? 'Recorded reading'
                  : 'No reading yet'}
            </span>
          </div>
          <div className="stat-foot">
            {isOfflineNoData
              ? 'Start AI service to enable crowd detection'
              : latestDetection
                ? `Latest camera reading: ${latestDetection.modelName || 'unknown model'} in ${latestDetection.zoneName || 'configured zone'}`
                : `${cameras.filter((camera) => camera.status === 'Live').length} camera(s) have a recent AI sample`}
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>ACTIVE CAMERAS</span>
            <span className="stat-icon green">◉</span>
          </div>
          <div className="stat-value">
            {cameras.filter((c) => c.status === 'Live').length} <small>/ {cameras.length}</small>
            <span className="trend stable">Live status</span>
          </div>
          <div className="stat-foot">
            {!aiConnected ? (
              <span style={{ color: '#db9225' }}>⚠ AI Detection Paused — streams active without detection</span>
            ) : (
              <>{cameras.filter((camera) => camera.status === 'Live').length} camera(s) have a recent successful sample</>
            )}
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>AVERAGE CAPACITY</span>
            <span className={`stat-icon ${avgCapacity > 75 ? 'red' : avgCapacity > 50 ? 'amber' : 'green'}`}>◴</span>
          </div>
          <div className="stat-value">
            {isOfflineNoData ? '—' : <>{avgCapacity}<span className="unit">%</span></>}
            <span className={`trend ${isOfflineNoData ? 'stable' : avgCapacity > 75 ? 'critical' : avgCapacity > 50 ? 'warning' : 'positive'}`}>
              {isOfflineNoData ? 'No Detection Data' : avgCapacity > 75 ? 'High Density' : avgCapacity > 50 ? 'Moderate' : 'Safe Limits'}
            </span>
          </div>
          <div className="stat-foot">Across {zones.length} monitored safety zones</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>ACTIVE INCIDENTS</span>
            <span className={`stat-icon ${activeIncidentsCount > 0 ? 'red' : 'green'}`}>⚑</span>
          </div>
          <div className="stat-value">
            {String(activeIncidentsCount).padStart(2, '0')}{' '}
            <span className={`trend ${activeIncidentsCount > 0 ? 'critical' : 'positive'}`}>
              {activeIncidentsCount > 0 ? `${activeIncidentsCount} require attention` : '✓ All Clear · Normal'}
            </span>
          </div>
          <div className="stat-foot">
            {activeIncidentsCount > 0
              ? `${incidents.filter((i) => i.level === 'Critical' && i.status === 'Open').length} critical · ${incidents.filter((i) => i.level === 'Warning' && i.status === 'Open').length} warning`
              : '0 critical threshold breaches'}
          </div>
        </article>
      </div>

      {/* Main Trends & Zone Capacity Grid */}
      <div className="dashboard-grid">
        {/* Observed trend panel */}
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>Observed zone occupancy trend</h2>
              <p>Latest recorded estimates; camera views in the same zone are combined</p>
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Chart range">
              <option value="Today">Today</option>
              <option value="Last 24 hours">Last 24 hours</option>
              <option value="This week">This week</option>
            </select>
          </div>

          {/* Offline empty state for chart */}
          {isOfflineNoData ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              textAlign: 'center',
              background: 'rgba(224, 85, 85, 0.05)',
              borderRadius: '8px',
              margin: '12px 0',
              border: '1px dashed rgba(224, 85, 85, 0.3)'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
              <b style={{ color: '#e05555', fontSize: '14px' }}>AI service offline — No detection data available</b>
              <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '6px 0 0' }}>
                Start the AI service (localhost:8000) and run crowd scans to populate this chart with real detection data.
              </p>
            </div>
          ) : (
            <>
              <div className="chart-summary">
                <strong>{totalPeople.toLocaleString()} people</strong>
                <span className={`trend ${totalPeople > 0 ? 'positive' : 'stable'}`}>
                  {totalPeople > 0 ? 'Recorded zone estimate' : 'No reading yet'}
                </span>
                <small>
                  {totalPeople > 0
                    ? (latestDetection ? `Active scan: ${latestDetection.modelName?.toUpperCase() || 'CSRNET'} in ${latestDetection.zoneName || 'Venue Zone'}` : 'Active detected venue occupancy')
                    : 'No individuals currently detected across monitored camera zones'}
                </small>
              </div>

              <div className="chart-wrap">
                <div className="y-labels">
                  <span>{Math.max(10, Math.round(totalPeople * 1.5))}</span>
                  <span>{Math.max(6, Math.round(totalPeople * 1.0))}</span>
                  <span>{Math.max(2, Math.round(totalPeople * 0.5))}</span>
                  <span>0</span>
                </div>
                <TrendLineChart totalCount={totalPeople} range={range} detectionLog={detectionLog} />
                <div className="x-labels"><span>{detectionLog.length ? 'Earlier detections' : 'Latest available reading'}</span><span>Most recent</span></div>
              </div>

              <div className="chart-legend">
                <span><i className="legend-blue" /> Observed detections</span>
                <button className="text-button" onClick={() => setPage('Forecast')}>Open trend projection →</button>
              </div>
            </>
          )}
        </section>

        {/* Zone Capacity Panel */}
        <section className="panel zone-panel">
          <div className="panel-heading">
            <div>
              <h2>Zone Capacity Gauges</h2>
              <p>Real-time headcount vs safety ceiling</p>
            </div>
            <button className="text-button" onClick={() => setPage('Zones')}>
              Configure zones <span>→</span>
            </button>
          </div>

          <div className="zone-list">
            {zones.map((zone) => (
              <div className="zone-row" key={zone.id}>
                <div className="zone-name">
                  <span className={`zone-dot ${zone.status}`} />
                  <b>{zone.name}</b>
                  <span className={`zone-badge ${zone.status}`}>
                    {isOfflineNoData ? '—' : `${zone.occupancyPct}%`}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${isOfflineNoData ? 'normal' : zone.status}`}
                    style={{ width: isOfflineNoData ? '0%' : `${Math.min(100, zone.occupancyPct)}%` }}
                  />
                </div>
                <small>
                  {isOfflineNoData
                    ? `— / ${zone.maxCapacity} people (${zone.egressCount} egress corridors) · AI offline`
                    : `${zone.currentCount} / ${zone.maxCapacity} people (${zone.egressCount} egress corridors)`}
                </small>
              </div>
            ))}
          </div>

          <div className="zone-foot">
            {zones.some(z => z.status === 'critical') ? (
              <>
                <span className="status-dot red-dot" />
                <span className="text-red">Critical capacity alert in {zones.filter(z => z.status === 'critical').length} zone(s)</span>
              </>
            ) : zones.some(z => z.status === 'warning') ? (
              <>
                <span className="status-dot amber-dot" />
                <span className="text-amber">{zones.filter(z => z.status === 'warning').length} zone nearing warning threshold</span>
              </>
            ) : (
              <>
                <span className="status-dot green-dot" />
                <span className="text-green">All {zones.length} zone(s) operating within safe capacity</span>
              </>
            )}
            <button onClick={() => setPage('Forecast')}>Inspect forecast →</button>
          </div>
        </section>
      </div>

      {/* Live Camera Grid Section with Real Canvas Streams */}
      <section className="panel camera-panel">
        <div className="panel-heading">
          <div>
            <h2>Camera sources <span className="feed-count">{cameras.length} configured</span></h2>
            <p>
              {aiConnected
                ? 'Each network camera is sampled by its assigned model when the source is reachable.'
                : 'AI inference is unavailable. Camera preview availability depends on the source type.'}
            </p>
          </div>
          <div className="camera-actions">
            <button
              className={`toggle-chip ${heatmap ? 'selected' : ''}`}
              onClick={() => setHeatmap(!heatmap)}
              title="Toggle continuous Gaussian density heatmap"
            >
              <span className="heat-icon">▧</span> Density Heatmap
              <span className={`switch ${heatmap ? 'on' : ''}`}><i /></span>
            </button>

            <button
              className={`toggle-chip ${flowVectors ? 'selected' : ''}`}
              onClick={() => setFlowVectors(!flowVectors)}
              title="Toggle Farneback optical flow motion vectors"
            >
              <span className="heat-icon">⇗</span> Flow Vectors
              <span className={`switch ${flowVectors ? 'on' : ''}`}><i /></span>
            </button>

            <button className="text-button" onClick={() => setPage('Live monitor')}>
              Open Multi-Monitor <span>→</span>
            </button>
          </div>
        </div>

        <div className="camera-grid">
          {cameras.slice(0, 3).map((cam) => (
            <article className="camera-card" key={cam.id}>
              <div className="camera-visual" style={{ height: '170px' }}>
                <CCTVCanvasStream
                  cameraId={cam.id}
                  cameraName={cam.name}
                  count={cam.count}
                  resolution={cam.resolution}
                  fps={cam.fps}
                  latencyMs={cam.latencyMs}
                  heatmap={heatmap}
                  flowVectors={flowVectors}
                  sceneType={cam.scene || cam.sceneType}
                  height={170}
                  streamType={cam.streamType}
                  streamUrl={cam.streamUrl}
                  isWebcam={cam.isWebcam || cam.id === 'CAM-WEBCAM' || cam.streamType === 'webcam'}
                  zoneId={cam.zoneId}
                  cameraStatus={cam.status}
                  modelType={cam.modelType}
                  snapshotUrl={cam.lastSnapshot || cam.snapshotUrl || cam.lastDetection?.imageSrc || null}
                  lastSnapshot={cam.lastSnapshot || cam.lastDetection?.imageSrc || null}
                  heatmapUrl={cam.heatmapUrl || cam.lastDetection?.heatmapUrl || null}
                  onSnapshot={handleCameraSnapshot}
                />
              </div>
              <div className="camera-info">
                <div>
                  <h3>{cam.name}</h3>
                  <small>{cam.zone} · {cam.latencyMs}ms</small>
                </div>
                <span className="camera-count">
                  {aiConnected ? cam.count : '—'} <small>people</small>
                </span>
              </div>
              <div className="camera-capacity">
                <div className="camera-track">
                  <div
                    className={`progress-fill ${cam.capacity > 85 ? 'critical' : cam.capacity > 70 ? 'warning' : 'normal'}`}
                    style={{ width: aiConnected ? `${cam.capacity}%` : '0%' }}
                  />
                </div>
                <small>{aiConnected ? `${cam.capacity}% capacity` : 'AI offline'}</small>
                <button
                  className="text-button"
                  style={{ marginLeft: 'auto', fontSize: '12px' }}
                  onClick={() => { setActiveCameraId(cam.id); setPage('Live monitor'); }}
                >
                  Inspect →
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Camera grid footer status */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: '12px', color: 'var(--muted)' }}>
          {!aiConnected ? (
            <span style={{ color: '#db9225' }}>
              ⚠ AI detection service offline — camera streams active without detection
            </span>
          ) : (
            <span style={{ color: '#19a779' }}>
              ● All edge &amp; local camera streams healthy · CSRNet detection active
            </span>
          )}
        </div>
      </section>

      {/* Recent Incidents Table */}
      <section className="panel incident-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Operational Incidents <span className="incident-count">{incidents.length}</span></h2>
            <p>Automated threshold breaches and operator incident logging</p>
          </div>
          <button className="text-button" onClick={() => setPage('Incidents')}>
            Incident center &amp; Replay <span>→</span>
          </button>
        </div>

        <div className="incident-table">
          <div className="table-head">
            <span>TIME</span>
            <span>INCIDENT DESCRIPTION</span>
            <span>LOCATION</span>
            <span>SEVERITY</span>
            <span>ACTION</span>
          </div>

          {incidents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
              <span style={{ color: '#19a779', fontWeight: '700', fontSize: '14px' }}>✓ All Safety Zones Operating Normally</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>No active threshold breaches or bottlenecks detected across venue cameras.</p>
            </div>
          ) : (
            incidents.map((item) => (
              <div className="incident-row" key={item.id}>
                <span className="incident-time">{item.time}</span>
                <span className="incident-title">
                  <i className={`incident-mark ${item.color}`}>
                    {item.color === 'red' ? '!' : item.color === 'amber' ? '↗' : '✓'}
                  </i>
                  <b>{item.title}</b>
                </span>
                <span className="incident-location">{item.location}</span>
                <span>
                  <em className={`incident-status ${item.color}`}>{item.level}</em>
                </span>
                <button
                  className="text-button"
                  onClick={() => setPage('Incidents')}
                  style={{ fontSize: '10px' }}
                >
                  Replay ↺
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <footer className="page-footer">
        <span>© 2026 CrowdSense <b>·</b> Crowd monitoring workspace</span>
        <span>
          AI service: <b>{aiConnected ? 'Available' : 'Offline'}</b> <b>·</b>
          {aiConnected ? 'Model and latency are reported for each camera sample.' : 'New inference is unavailable.'}
        </span>
      </footer>
    </div>
  );
}
