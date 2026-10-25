import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AnalyticsView() {
  const { zones } = useCrowdStore();
  const [timeRange, setTimeRange] = useState('24h');

  const hourlyData = [
    { hour: '08:00', influx: 320, outflux: 110, total: 210 },
    { hour: '10:00', influx: 540, outflux: 220, total: 530 },
    { hour: '12:00', influx: 820, outflux: 410, total: 940 },
    { hour: '14:00', influx: 980, outflux: 630, total: 1290 },
    { hour: '16:00', influx: 740, outflux: 810, total: 1220 },
    { hour: '18:00', influx: 410, outflux: 890, total: 740 },
    { hour: '20:00', influx: 180, outflux: 520, total: 400 }
  ];

  const maxTotal = 1400;

  return (
    <div className="analytics-container">
      {/* Analytics Filter Header */}
      <div className="analytics-header">
        <div>
          <h2>Historical Crowd Intelligence & Flow Distribution</h2>
          <p>Longitudinal analysis based on continuous density regression time-series</p>
        </div>
        <div className="range-pills">
          {['1h', '6h', '24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              className={`pill-btn ${timeRange === r ? 'active' : ''}`}
              onClick={() => setTimeRange(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-grid">
        {/* Influx / Outflux Throughput Chart */}
        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-heading">
            <div>
              <h2>Hourly Venue Throughput & Density Accumulation</h2>
              <p>People entering vs exiting venue gates</p>
            </div>
            <div className="chart-legend" style={{ margin: 0 }}>
              <span><i className="legend-blue" style={{ background: '#3478e5' }} /> Total Occupancy</span>
              <span><i className="legend-blue" style={{ background: '#19a779' }} /> Influx (Entered)</span>
              <span><i className="legend-blue" style={{ background: '#d9565e' }} /> Outflux (Exited)</span>
            </div>
          </div>

          <div className="bar-chart-container">
            {hourlyData.map((d) => (
              <div key={d.hour} className="bar-col">
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${(d.total / maxTotal) * 100}%`,
                      background: d.total > 1100 ? '#db9225' : '#3478e5'
                    }}
                    title={`Total Occupancy: ${d.total}`}
                  />
                </div>
                <div className="bar-sub-values">
                  <span className="text-green">+{d.influx}</span>
                  <span className="text-red">-{d.outflux}</span>
                </div>
                <span className="bar-label">{d.hour}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Zone Distribution Breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Zone Density Share</h2>
              <p>Relative distribution of occupants</p>
            </div>
          </div>

          <div className="zone-share-list">
            {zones.map((z) => (
              <div key={z.id} className="share-row">
                <div className="share-meta">
                  <b>{z.name}</b>
                  <span>{z.currentCount} persons ({z.occupancyPct}% of capacity)</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${z.status}`}
                    style={{ width: `${z.occupancyPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottleneck Duration & Safety Compliance Table */}
      <section className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Congestion & Bottleneck Duration Log</h2>
            <p>Monitored safety intervals exceeding 75% capacity limits</p>
          </div>
          <span className="badge-pill">NFPA-101 Standard Monitored</span>
        </div>

        <div className="incident-table">
          <div className="table-head">
            <span>ZONE</span>
            <span>DURATION</span>
            <span>PEAK OCCUPANCY</span>
            <span>MAX FLOW IMPEDANCE</span>
            <span>STATUS</span>
          </div>

          <div className="incident-row">
            <b>Central concourse (Zone 02)</b>
            <span>42 minutes</span>
            <span className="text-red">298 people (94%)</span>
            <span>Low egress flow (0.28 px/s)</span>
            <span><em className="incident-status red">Active Bottleneck</em></span>
          </div>

          <div className="incident-row">
            <b>North entrance (Zone 01)</b>
            <span>18 minutes</span>
            <span className="text-amber">156 people (78%)</span>
            <span>Normal transit (1.4 px/s)</span>
            <span><em className="incident-status amber">Clearing</em></span>
          </div>

          <div className="incident-row">
            <b>Food court & lounge (Zone 04)</b>
            <span>25 minutes</span>
            <span className="text-green">192 people (64%)</span>
            <span>Normal transit (1.8 px/s)</span>
            <span><em className="incident-status green">Safe</em></span>
          </div>
        </div>
      </section>
    </div>
  );
}
