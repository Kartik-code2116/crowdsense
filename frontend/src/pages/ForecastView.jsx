import React, { useState } from 'react';

export default function ForecastView() {
  const [horizonMinutes, setHorizonMinutes] = useState(16);

  const forecastPoints = [
    { minute: 'Now (14:36)', actual: 286, forecast: 286, lower: 286, upper: 286, risk: 'Critical' },
    { minute: '+2 min', actual: null, forecast: 294, lower: 288, upper: 300, risk: 'Critical' },
    { minute: '+4 min', actual: null, forecast: 302, lower: 292, upper: 312, risk: 'Critical' },
    { minute: '+6 min', actual: null, forecast: 310, lower: 298, upper: 322, risk: 'Critical' },
    { minute: '+8 min (Peak)', actual: null, forecast: 324, lower: 308, upper: 340, risk: 'Overcrowded' },
    { minute: '+10 min', actual: null, forecast: 318, lower: 298, upper: 338, risk: 'Critical' },
    { minute: '+12 min', actual: null, forecast: 306, lower: 282, upper: 330, risk: 'Critical' },
    { minute: '+14 min', actual: null, forecast: 292, lower: 264, upper: 320, risk: 'Warning' },
    { minute: '+16 min', actual: null, forecast: 275, lower: 245, upper: 305, risk: 'Warning' }
  ];

  return (
    <div className="forecast-container">
      {/* High Alert Warning Banner */}
      <div className="warning-banner">
        <div className="banner-icon">⚠</div>
        <div className="banner-content">
          <h3>PROACTIVE OVERCROWDING PREDICTED IN 8 MINUTES</h3>
          <p>
            LSTM Sequence Predictor forecasts <b>Central Concourse (Zone 02)</b> will exceed 100% capacity 
            (reaching <b>324 people / 315 limit</b>) by 14:44. Recommended action: Divert entrance flow to Gate B.
          </p>
        </div>
        <button className="button primary" style={{ background: '#d9565e', borderColor: '#d9565e' }}>
          Execute Gate Diversion
        </button>
      </div>

      <div className="forecast-grid-layout">
        {/* Forecast Curve Panel */}
        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-heading">
            <div>
              <h2>CrowdFlowLSTM Multi-Horizon Influx Forecast</h2>
              <p>Autoregressive sequential forecasting trained on temporal density sequences</p>
            </div>
            <div className="chart-legend" style={{ margin: 0 }}>
              <span><i className="legend-blue" style={{ background: '#3478e5' }} /> Actual Count</span>
              <span><i className="legend-dash" style={{ borderColor: '#db9225' }} /> LSTM Mean Forecast</span>
              <span><i className="legend-blue" style={{ background: '#f5eadc' }} /> 95% Confidence Band</span>
            </div>
          </div>

          <div className="forecast-chart-box">
            <svg viewBox="0 0 600 180" className="forecast-svg" preserveAspectRatio="none">
              {/* Confidence Band Polygon */}
              <polygon
                points="50,90 110,82 170,74 230,66 290,52 350,58 410,70 470,84 530,101 530,40 470,25 410,18 350,10 290,2 230,18 170,28 110,40 50,90"
                fill="rgba(219, 146, 37, 0.15)"
              />
              {/* Critical threshold line at 315 people */}
              <line x1="0" y1="35" x2="600" y2="35" stroke="#d9565e" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x="10" y="30" fill="#d9565e" fontSize="9" fontWeight="700">Capacity Ceiling (315 Limit)</text>

              {/* Observed line */}
              <line x1="10" y1="120" x2="50" y2="90" stroke="#3478e5" strokeWidth="3" />

              {/* Forecast Mean Line */}
              <polyline
                points="50,90 110,82 170,74 230,66 290,52 350,58 410,70 470,84 530,101"
                fill="none"
                stroke="#db9225"
                strokeWidth="2.5"
                strokeDasharray="5 5"
              />

              {/* Peak Circle */}
              <circle cx="290" cy="52" r="6" fill="#d9565e" stroke="#fff" strokeWidth="2" />
              <text x="295" y="46" fill="#d9565e" fontSize="10" fontWeight="700">Peak: 324 (+8 min)</text>
            </svg>
          </div>

          <div className="forecast-timeline-table">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>TIME HORIZON</th>
                  <th>PREDICTED OCCUPANCY</th>
                  <th>95% CONFIDENCE INTERVAL</th>
                  <th>ZONE SAFETY IMPACT</th>
                </tr>
              </thead>
              <tbody>
                {forecastPoints.map((p) => (
                  <tr key={p.minute}>
                    <td><b>{p.minute}</b></td>
                    <td>
                      <b style={{ color: p.forecast > 315 ? '#d9565e' : p.forecast > 290 ? '#db9225' : '#3478e5' }}>
                        {p.forecast} people ({Math.round((p.forecast / 315) * 100)}%)
                      </b>
                    </td>
                    <td>[{p.lower} - {p.upper} persons]</td>
                    <td>
                      <span className={`incident-status ${p.forecast > 315 ? 'red' : p.forecast > 290 ? 'amber' : 'green'}`}>
                        {p.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Spec Card */}
        <div className="panel">
          <div className="panel-heading">
            <h2>Forecasting Architecture</h2>
          </div>
          <div className="telemetry-card">
            <div className="metric-row">
              <span>Model Type</span>
              <b>2-Layer Recurrent LSTM</b>
            </div>
            <div className="metric-row">
              <span>Hidden State Dim</span>
              <b>64 Units</b>
            </div>
            <div className="metric-row">
              <span>Lookback Window</span>
              <b>12 timesteps (24 min)</b>
            </div>
            <div className="metric-row">
              <span>Forecast Horizon</span>
              <b>8 steps (16 min ahead)</b>
            </div>
            <div className="metric-row">
              <span>Input Features</span>
              <b>[Count, Density Peak, Flow Speed]</b>
            </div>
            <div className="metric-row">
              <span>Inference Time</span>
              <b>3.8 ms</b>
            </div>
          </div>

          <div className="diagnostic-note" style={{ marginTop: '16px' }}>
            <b>Viva / Presentation High-Point:</b>
            <p>
              Traditional safety platforms only trigger alarms <i>after</i> a crowd is already crushed. 
              CrowdSense couples density estimation with an LSTM sequence model to alert operators 
              <b>8 minutes in advance</b>, giving venue guards sufficient lead time to meter turnstiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
