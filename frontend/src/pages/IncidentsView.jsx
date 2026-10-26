import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function IncidentsView() {
  const { incidents, resolveIncident, inspectInCrowdSearch } = useCrowdStore();
  const [filter, setFilter] = useState('All');
  const [selectedIncident, setSelectedIncident] = useState(incidents[0]);
  const [replayOffsetMinutes, setReplayOffsetMinutes] = useState(0); // -15, -10, -5, 0 (trigger), +5

  const filteredIncidents = filter === 'All' 
    ? incidents 
    : incidents.filter((i) => i.level === filter || (filter === 'Resolved' && i.status === 'Resolved'));

  // Calculate simulated historical count based on scrub offset
  const scrubbedCount = selectedIncident 
    ? Math.max(20, selectedIncident.count + (replayOffsetMinutes * 9))
    : 180;

  return (
    <div className="incidents-container">
      <div className="page-action-row">
        <div>
          <h2>Incident Center & Historical Incident Replay</h2>
          <p>Forensic inspection of crowd density surges and safety threshold breaches</p>
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
            {filteredIncidents.map((item) => (
              <div
                key={item.id}
                className={`incident-card-item ${selectedIncident?.id === item.id ? 'active-incident' : ''}`}
                onClick={() => { setSelectedIncident(item); setReplayOffsetMinutes(0); }}
              >
                <div className="incident-card-top">
                  <span className={`incident-mark ${item.color}`}>
                    {item.color === 'red' ? '!' : item.color === 'amber' ? '↗' : '✓'}
                  </span>
                  <b>{item.title}</b>
                  <em className={`incident-status ${item.color}`}>{item.level}</em>
                </div>
                <div className="incident-card-meta">
                  <span>📍 {item.location}</span>
                  <span>⏱ {item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Incident Replay Scrubber Studio */}
        {selectedIncident && (
          <div className="incident-replay-studio panel">
            <div className="panel-heading">
              <div>
                <h2>Incident Replay: {selectedIncident.title}</h2>
                <p>Location: <b>{selectedIncident.location}</b> · Trigger Timestamp: <b>{selectedIncident.time}</b></p>
              </div>
              {selectedIncident.status !== 'Resolved' ? (
                <button
                  className="button primary"
                  onClick={() => resolveIncident(selectedIncident.id)}
                >
                  ✓ Mark Resolved
                </button>
              ) : (
                <span className="badge-pill" style={{ background: '#ecf8f2', color: '#279d75' }}>
                  ✓ Resolved by Operator
                </span>
              )}
            </div>

            {/* Reconstructed Density Visual Frame */}
            <div className="replay-visual-box" style={{ position: 'relative', overflow: 'hidden', height: '240px', background: '#0a1016' }}>
              {selectedIncident.snapshotUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img
                    src={selectedIncident.snapshotUrl}
                    alt="Incident Frame"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div style={{ position: 'absolute', top: '10px', left: '12px', background: 'rgba(0,0,0,0.75)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#00ffcc', fontFamily: 'monospace' }}>
                    SOURCE CAPTURE · {selectedIncident.time} · {selectedIncident.count} PERSONS
                  </div>
                </div>
              ) : (
                <div className="scene concourse" style={{ height: '240px' }}>
                  <div className="scene-building building-a" />
                  <div className="scene-building building-b" />
                  <div className="scene-floor" />
                  {Array.from({ length: Math.min(18, Math.floor(scrubbedCount / 16)) }, (_, i) => (
                    <span key={i} className={`person p${(i % 12) + 1}`}>
                      <i />
                    </span>
                  ))}
                  <div
                    className="heat heat-a"
                    style={{ transform: `scale(${0.7 + scrubbedCount / 250})` }}
                  />
                  <div
                    className="heat heat-b"
                    style={{ transform: `scale(${0.7 + scrubbedCount / 250})` }}
                  />
                  <span className="camera-label">
                    REPLAY · {replayOffsetMinutes === 0 ? 'TRIGGER MOMENT' : `${replayOffsetMinutes > 0 ? '+' : ''}${replayOffsetMinutes} MIN`}
                  </span>
                  <span className="scene-time">14:32:{replayOffsetMinutes >= 0 ? 10 + replayOffsetMinutes : 50 + replayOffsetMinutes}</span>
                </div>
              )}
            </div>

            {selectedIncident.snapshotUrl && (
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <button
                  className="button secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => inspectInCrowdSearch(selectedIncident.snapshotUrl)}
                >
                  🔍 Deep Inspect Source Frame in Crowd Search →
                </button>
              </div>
            )}

            {/* Scrubber Timeline Controls */}
            <div className="scrubber-control-box">
              <div className="scrubber-header">
                <div>
                  <small>TIMELINE SCRUBBER</small>
                  <b>{replayOffsetMinutes === 0 ? 'Incident Trigger Moment (14:32:08)' : `${replayOffsetMinutes > 0 ? '+' : ''}${replayOffsetMinutes} min relative to breach`}</b>
                </div>
                <div className="scrubber-readout">
                  <span>Reconstructed Count:</span>
                  <b style={{ color: scrubbedCount > 250 ? '#d9565e' : '#3478e5', fontSize: '16px' }}>
                    {scrubbedCount} people
                  </b>
                </div>
              </div>

              <input
                type="range"
                min="-15"
                max="10"
                step="5"
                value={replayOffsetMinutes}
                onChange={(e) => setReplayOffsetMinutes(Number(e.target.value))}
                className="timeline-slider"
              />

              <div className="timeline-ticks">
                <span>-15 min</span>
                <span>-10 min</span>
                <span>-5 min</span>
                <b className="trigger-tick">● Trigger (0m)</b>
                <span>+5 min</span>
                <span>+10 min</span>
              </div>
            </div>

            {/* Operator Incident Notes */}
            <div className="incident-diagnostic-notes">
              <h4>Safety Officer Forensic Log</h4>
              <p>
                {selectedIncident.notes || (
                  <>
                    At {selectedIncident.time}, deep learning crowd detection recorded an active threshold trigger in {selectedIncident.location}. 
                    Peak count recorded at <b>{selectedIncident.count} persons</b> against a ceiling of <b>{selectedIncident.capacity}</b>. 
                    Automated safety telemetry dispatched to control room.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
