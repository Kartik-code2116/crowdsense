import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function IncidentsView() {
  const { incidents, resolveIncident, inspectInCrowdSearch, cameras } = useCrowdStore();
  const [filter, setFilter] = useState('All');
  const [selectedIncident, setSelectedIncident] = useState(incidents[0]);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);
  const [resolveError, setResolveError] = useState('');
  const [resolving, setResolving] = useState(false);

  // Sync selectedIncident if list changes and nothing selected
  React.useEffect(() => {
    if (!selectedIncident && incidents.length > 0) {
      setSelectedIncident(incidents[0]);
    }
  }, [incidents, selectedIncident]);

  const filteredIncidents = filter === 'All' 
    ? incidents 
    : incidents.filter((i) => i.level === filter || (filter === 'Resolved' && i.status === 'Resolved'));

  const incidentCamera = cameras.find((camera) => camera.id === selectedIncident?.cameraId);
  const realImageSrc = selectedIncident?.snapshotBase64 || selectedIncident?.snapshotUrl || incidentCamera?.lastSnapshot || null;
  const realHeatmapSrc = selectedIncident?.heatmapUrl || incidentCamera?.heatmapUrl || null;
  const incidentCount = Number(selectedIncident?.count) || 0;
  const capacityPct = selectedIncident?.capacity ? Math.round((incidentCount / selectedIncident.capacity) * 100) : selectedIncident?.occupancyPct;

  const handleResolve = async () => {
    setResolving(true);
    setResolveError('');
    const result = await resolveIncident(selectedIncident.id);
    if (!result?.success) setResolveError(result?.message || 'Could not resolve this incident.');
    setResolving(false);
  };

  return (
    <div className="incidents-container">
      <div className="page-action-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>Incident review</h2>
          </div>
          <p>Review incidents created when a recorded zone estimate crosses its configured capacity threshold.</p>
        </div>
        <div className="range-pills">
          {['All', 'Critical', 'Warning', 'Resolved'].map((lvl) => (
            <button
              key={lvl}
              className={`pill-btn ${filter === lvl ? 'active' : ''}`}
              onClick={() => setFilter(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="incidents-layout-grid">
        {/* Left: Incident List */}
        <div className="incidents-list-panel panel">
          <div className="panel-heading">
            <h2>Active & Historical Incidents ({filteredIncidents.length})</h2>
          </div>

          <div className="incidents-scroll-list">
            {filteredIncidents.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                <span style={{ color: '#19a779', fontWeight: '700' }}>✓ All Clear</span>
                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>No {filter !== 'All' ? filter.toLowerCase() : ''} incidents on record.</p>
              </div>
            ) : (
              filteredIncidents.map((item) => (
                <div
                  key={item.id}
                  className={`incident-card-item ${selectedIncident?.id === item.id ? 'active-incident' : ''}`}
                  onClick={() => { setSelectedIncident(item); setResolveError(''); }}
                >
                  <div className="incident-card-top">
                    <span className={`incident-mark ${item.color}`}>
                      {item.color === 'red' ? '!' : item.color === 'amber' ? '↗' : '✓'}
                    </span>
                    <b>{item.title}</b>
                    <em className={`incident-status ${item.color}`}>{item.level}</em>
                  </div>
                  {(item.snapshotUrl || item.snapshotBase64) && (
                    <div style={{ marginTop: '6px', marginBottom: '6px', borderRadius: '4px', overflow: 'hidden', height: '48px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={item.snapshotUrl || item.snapshotBase64} alt="Incident Frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div className="incident-card-meta">
                    <span>📍 {item.location}</span>
                    <span>⏱ {item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Incident evidence and threshold context */}
        {selectedIncident ? (
          <div className="incident-replay-studio panel">
            <div className="panel-heading">
              <div>
                <h2>{selectedIncident.title}</h2>
                <p>Location: <b>{selectedIncident.location}</b> · Trigger Timestamp: <b>{selectedIncident.time}</b></p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className={`toggle-chip ${showHeatmapOverlay ? 'selected' : ''}`}
                  onClick={() => setShowHeatmapOverlay(!showHeatmapOverlay)}
                  style={{ height: '32px', fontSize: '12px' }}
                >
                  <span className="heat-icon">▧</span> Heatmap
                  <span className={`switch ${showHeatmapOverlay ? 'on' : ''}`}><i /></span>
                </button>
                {selectedIncident.status !== 'Resolved' ? (
                  <button
                    className="button primary"
                    onClick={handleResolve}
                    disabled={resolving}
                    style={{ height: '32px', fontSize: '12px' }}
                  >
                    {resolving ? 'Saving…' : '✓ Mark resolved'}
                  </button>
                ) : (
                  <span className="badge-pill" style={{ background: '#ecf8f2', color: '#279d75' }}>
                    ✓ Resolved
                  </span>
                )}
              </div>
            </div>
            {resolveError && <div role="alert" className="diagnostic-note" style={{ marginTop: 10 }}>{resolveError}</div>}

            {/* Evidence captured when the threshold was crossed */}
            <div className="replay-visual-box" style={{ position: 'relative', overflow: 'hidden', height: '280px', background: '#0a1016', borderRadius: '8px' }}>
              {realImageSrc ? <img src={realImageSrc} alt="Frame captured when the incident threshold was crossed" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ display: 'grid', placeContent: 'center', height: '100%', textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No camera frame was saved with this incident.<br />Threshold and detection details remain available below.</div>}

              {showHeatmapOverlay && realHeatmapSrc && (
                <img
                  src={realHeatmapSrc}
                  alt="CSRNet Density Map"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.65,
                    mixBlendMode: 'screen',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Real CCTV On-Screen Display */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '14px',
                background: 'rgba(5, 12, 22, 0.85)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '6px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                color: '#fff',
                fontFamily: 'monospace',
                display: 'flex',
                gap: '12px',
                zIndex: 2
              }}>
                <span style={{ color: '#ffb300', fontWeight: '700' }}>THRESHOLD INCIDENT</span>
                {selectedIncident.cameraId && <span>Camera: <b>{selectedIncident.cameraId}</b></span>}
                <span>Observed: <b>{incidentCount} people{capacityPct !== undefined && capacityPct !== null ? ` · ${capacityPct}% of ${selectedIncident.capacity || 'configured'} capacity` : ''}</b></span>
              </div>

              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '14px',
                background: 'rgba(5, 12, 22, 0.85)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10.5px',
                color: 'var(--muted)',
                fontFamily: 'monospace',
                zIndex: 2
              }}>
                {selectedIncident.level} · {selectedIncident.time}
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Recorded threshold event · {selectedIncident.time}</div>
              <button
                className="button secondary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => inspectInCrowdSearch(realImageSrc, selectedIncident.zoneId)}
                disabled={!realImageSrc}
              >
                🔍 Inspect saved frame →
              </button>
            </div>

            <div className="incident-diagnostic-notes">
              <h4>Incident details</h4>
              <p>
                {selectedIncident.notes || (
                  <>
                    At {selectedIncident.time}, the observed zone estimate crossed its configured threshold in {selectedIncident.location}.
                    The recorded estimate was <b>{incidentCount} people</b> against a capacity of <b>{selectedIncident.capacity}</b>.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
            Select an incident from the log to view forensic replay.
          </div>
        )}
      </div>
    </div>
  );
}
