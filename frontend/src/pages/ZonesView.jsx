import React from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function ZonesView() {
  const { zones, updateZoneThresholds, setScannerTargetZoneId, setPage } = useCrowdStore();

  return (
    <div className="zones-view-container">
      <div className="page-action-row">
        <div>
          <h2>Safety Zones & Capacity Ceiling Management</h2>
          <p>Configurable dynamic thresholds that convert raw crowd counts into safety percentages</p>
        </div>
      </div>

      <div className="zones-grid">
        {zones.map((zone) => {
          const isCritical = zone.occupancyPct >= zone.criticalPct;
          const isWarning = zone.occupancyPct >= zone.warningPct && !isCritical;
          return (
            <div key={zone.id} className="panel zone-detail-card">
              <div className="panel-heading">
                <div>
                  <span className="zone-code">{zone.code}</span>
                  <h2>{zone.name}</h2>
                </div>
                <span className={`zone-badge ${zone.status}`}>
                  {zone.occupancyPct}% Occupancy
                </span>
              </div>

              <div className="zone-metric-stats">
                <div>
                  <small>Current Count</small>
                  <b>{zone.currentCount} <small>people</small></b>
                </div>
                <div>
                  <small>Max Capacity</small>
                  <b>{zone.maxCapacity} <small>limit</small></b>
                </div>
                <div>
                  <small>Emergency Exits</small>
                  <b>{zone.egressCount} <small>routes</small></b>
                </div>
              </div>

              <div className="progress-track" style={{ height: '8px', margin: '14px 0' }}>
                <div
                  className={`progress-fill ${zone.status}`}
                  style={{ width: `${Math.min(100, zone.occupancyPct)}%` }}
                />
              </div>

              {/* Threshold Sliders */}
              <div className="threshold-controls">
                <div className="slider-group">
                  <div className="slider-label">
                    <span>Warning Threshold</span>
                    <b>{zone.warningPct}%</b>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="85"
                    value={zone.warningPct}
                    onChange={(e) => updateZoneThresholds(zone.id, Number(e.target.value), zone.criticalPct)}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span>Critical Threshold</span>
                    <b>{zone.criticalPct}%</b>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="98"
                    value={zone.criticalPct}
                    onChange={(e) => updateZoneThresholds(zone.id, zone.warningPct, Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="zone-footer-status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <div>
                  {isCritical ? (
                    <span className="text-red">⚠ Critical Alert Fired: Automatic Egress Flow Protocol Activated</span>
                  ) : isWarning ? (
                    <span className="text-amber">▲ Warning: Re-routing gate influx recommended</span>
                  ) : (
                    <span className="text-green">✓ Normal operating condition within NFPA standards</span>
                  )}
                </div>
                <button
                  className="button secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                  onClick={() => {
                    setScannerTargetZoneId(zone.id);
                    setPage('Crowd search');
                  }}
                >
                  🔍 Scan Zone in Crowd Search →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
