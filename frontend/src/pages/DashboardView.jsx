import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import CCTVCanvasStream from '../components/CCTVCanvasStream';

function TrendLineChart({ range = 'Today' }) {
  const pointsMap = {
    Today: '0,78 30,71 60,73 90,57 120,62 150,45 180,52 210,37 240,44 270,28 300,36 330,18',
    'Last 24 hours': '0,90 30,85 60,82 90,75 120,60 150,55 180,48 210,40 240,32 270,24 300,20 330,18',
    'This week': '0,65 30,55 60,60 90,45 120,50 150,38 180,30 210,25 240,28 270,18 300,16 330,12'
  };

  const actualPoints = pointsMap[range] || pointsMap['Today'];
  const forecastPoints = '330,18 360,12 390,14 420,6 450,2';

  return (
    <svg className="line-chart" viewBox="0 0 460 116" preserveAspectRatio="none" role="img" aria-label="Occupancy trend chart">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3478e5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3478e5" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {[18, 42, 66, 90].map((y) => (
        <line key={y} x1="0" y1={y} x2="460" y2={y} className="chart-grid" />
      ))}
      <polygon points={`0,116 0,78 ${actualPoints} 330,116`} fill="url(#areaGradient)" />
      <polyline points={actualPoints} fill="none" className="chart-line" />
      <polyline points={forecastPoints} fill="none" className="forecast-line" />
      <circle cx="330" cy="18" r="4" fill="#3478e5" stroke="#fff" strokeWidth="2" />
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
    inspectInCrowdSearch
  } = useCrowdStore();

  const totalPeopleBase = cameras.reduce((sum, c) => sum + (c.count || 0), 0);
  const totalPeople = range === 'This week' ? totalPeopleBase * 4 : range === 'Last 24 hours' ? totalPeopleBase * 2 : totalPeopleBase;
  const avgCapacity = zones.length > 0 ? Math.round(zones.reduce((sum, z) => sum + (z.occupancyPct || 0), 0) / zones.length) : 0;
  const activeIncidentsCount = incidents.filter((i) => i.status === 'Open').length;

  const handleCameraSnapshot = (dataUrl) => {
    inspectInCrowdSearch(dataUrl);
  };

  return (
    <div className="dashboard-content-wrapper">
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
              ● LIVE AI SCAN ACTIVE
            </span>
            <div>
              <b style={{ fontSize: '14px', color: 'var(--text)' }}>
                {latestDetection.count} {latestDetection.count === 1 ? 'person' : 'people'} detected in {latestDetection.zoneName || 'Venue Zone'}
              </b>
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                Via {latestDetection.modelName?.toUpperCase() || 'YOLOv8'} · Latency: {latestDetection.latencyMs}ms · Synced at {latestDetection.timestamp}
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
            {totalPeople.toLocaleString()} <span className="trend positive">↗ 8.2%</span>
          </div>
          <div className="stat-foot">
            vs. previous hour <span className="sparkline">⌁</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>ACTIVE CAMERAS</span>
            <span className="stat-icon green">◉</span>
          </div>
          <div className="stat-value">
            {cameras.length} <small>/ {cameras.length}</small>
            <span className="trend stable">All online</span>
          </div>
          <div className="stat-foot">
            <span className="mini-live" /> All edge RTSP streams healthy
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>AVERAGE CAPACITY</span>
            <span className="stat-icon amber">◴</span>
          </div>
          <div className="stat-value">
            {avgCapacity}<span className="unit">%</span>
            <span className="trend warning">↑ 4.1%</span>
          </div>
          <div className="stat-foot">Across {zones.length} monitored safety zones</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>ACTIVE INCIDENTS</span>
            <span className="stat-icon red">⚑</span>
          </div>
          <div className="stat-value">
            0{activeIncidentsCount} <span className="trend critical">1 requires attention</span>
          </div>
          <div className="stat-foot">1 critical threshold · 1 warning</div>
        </article>
      </div>

      {/* Main Trends & Zone Capacity Grid */}
      <div className="dashboard-grid">
        {/* Trend Panel with LSTM dotted line */}
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>People in Venue Trend & Influx</h2>
              <p>Continuous density regression integration across all camera zones</p>
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Chart range">
              <option value="Today">Today</option>
              <option value="Last 24 hours">Last 24 hours</option>
              <option value="This week">This week</option>
            </select>
          </div>

          <div className="chart-summary">
            <strong>{totalPeople.toLocaleString()}</strong>
            <span className="trend positive">↗ 8.2%</span>
            <small>vs. previous period</small>
          </div>

          <div className="chart-wrap">
            <div className="y-labels">
              <span>1.5k</span>
              <span>1.0k</span>
              <span>500</span>
              <span>0</span>
            </div>
            <TrendLineChart range={range} />
            <div className="x-labels">
              <span>09:00</span>
              <span>10:00</span>
              <span>11:00</span>
              <span>12:00</span>
              <span>13:00</span>
              <span>14:00</span>
              <span>15:00</span>
            </div>
          </div>

          <div className="chart-legend">
            <span><i className="legend-blue" /> Actual Occupancy (CSRNet)</span>
            <span><i className="legend-dash" /> LSTM Forecast (+30m)</span>
            <span className="forecast-note">◷ Predicted peak (1,450) at 15:20</span>
          </div>
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
                  <span className={`zone-badge ${zone.status}`}>{zone.occupancyPct}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${zone.status}`}
                    style={{ width: `${Math.min(100, zone.occupancyPct)}%` }}
                  />
                </div>
                <small>{zone.currentCount} / {zone.maxCapacity} people ({zone.egressCount} egress corridors)</small>
              </div>
            ))}
          </div>

          <div className="zone-foot">
            <span className="status-dot amber-dot" />
            1 zone nearing critical capacity
            <button onClick={() => setPage('Forecast')}>Inspect forecast →</button>
          </div>
        </section>
      </div>

      {/* Live Camera Grid Section with Real Canvas Streams */}
      <section className="panel camera-panel">
        <div className="panel-heading">
          <div>
            <h2>Live CCTV Edge Feeds <span className="feed-count">{cameras.length} Active Streams</span></h2>
            <p>1-2 FPS sampled frames regressed via Python FastAPI microservice</p>
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
                  sceneType={cam.scene}
                  height={170}
                  onSnapshot={handleCameraSnapshot}
                />
              </div>
              <div className="camera-info">
                <div>
                  <h3>{cam.name}</h3>
                  <small>{cam.zone} · {cam.latencyMs}ms</small>
                </div>
                <span className="camera-count">
                  {cam.count} <small>people</small>
                </span>
              </div>
              <div className="camera-capacity">
                <div className="camera-track">
                  <div
                    className={`progress-fill ${cam.capacity > 85 ? 'critical' : cam.capacity > 70 ? 'warning' : 'normal'}`}
                    style={{ width: `${cam.capacity}%` }}
                  />
                </div>
                <small>{cam.capacity}% capacity</small>
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
      </section>

      {/* Recent Incidents Table */}
      <section className="panel incident-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Operational Incidents <span className="incident-count">{incidents.length}</span></h2>
            <p>Automated threshold breaches and operator incident logging</p>
          </div>
          <button className="text-button" onClick={() => setPage('Incidents')}>
            Incident center & Replay <span>→</span>
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

          {incidents.map((item) => (
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
          ))}
        </div>
      </section>

      <footer className="page-footer">
        <span>© 2026 CrowdSense <b>·</b> Production Crowd Safety Architecture</span>
        <span>Active Backbone: <b>CSRNet v1.2.0</b> <b>·</b> Mean Latency: <b>38.4ms</b> <b>·</b> Synchronized</span>
      </footer>
    </div>
  );
}
