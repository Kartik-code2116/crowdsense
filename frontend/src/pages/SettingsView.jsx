import React from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function SettingsView() {
  const { theme, setTheme, user } = useCrowdStore();

  const teamMembers = [
    {
      name: 'Alex Kumar',
      email: 'admin@crowdsense.io',
      role: 'admin',
      department: 'Venue Operations Lead',
      avatar: 'AK',
      status: 'Primary Administrator'
    }
  ];

  if (user && user.email !== 'admin@crowdsense.io') {
    teamMembers.push({
      name: user.name,
      email: user.email,
      role: 'admin',
      department: user.department || 'Venue Safety Operations',
      avatar: user.avatar || 'AD',
      status: 'Active Administrator (Current Session)'
    });
  }

  const auditLogs = [
    { action: 'Threshold Modified', user: user?.name || 'Alex Kumar', role: 'admin', details: 'Arena Concourse critical limit set to 85%', time: '14:10:15', ip: '127.0.0.1' },
    { action: 'Model Switched', user: user?.name || 'Alex Kumar', role: 'admin', details: 'Switched primary backbone to CSRNet (Dilated Conv)', time: '13:45:00', ip: '127.0.0.1' },
    { action: 'Incident Resolved', user: user?.name || 'Alex Kumar', role: 'admin', details: 'Marked safety warning as resolved', time: '13:56:12', ip: '127.0.0.1' },
    { action: 'Camera Reconnected', user: 'System Worker', role: 'system', details: 'Edge RTSP stream synchronized at 2.0 FPS', time: '13:02:18', ip: '127.0.0.1' }
  ];

  return (
    <div className="settings-view-container">
      <div className="page-action-row">
        <div>
          <h2>System Health, RBAC & Workspace Configuration</h2>
          <p>Microservice status, administrator role-based governance, and immutable audit logs</p>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="stat-grid" style={{ marginTop: '16px' }}>
        <div className="stat-card">
          <div className="stat-top"><span>NODE.JS API GATEWAY</span><span className="stat-icon green">✓</span></div>
          <div className="stat-value text-green">Online</div>
          <div className="stat-foot">Port 5000 · JWT RS256 Auth Active</div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>CSRNET DEEP LEARNING MODEL</span><span className="stat-icon blue">⚡</span></div>
          <div className="stat-value text-blue">38.4 <small>ms</small></div>
          <div className="stat-foot">PyTorch Dilated Conv · ShanghaiTech</div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>MONGODB TIME-SERIES</span><span className="stat-icon amber">⛁</span></div>
          <div className="stat-value text-amber">Connected</div>
          <div className="stat-foot">Port 27017 · User-Scoped Telemetry</div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>ACCESS CONTROL MODEL</span><span className="stat-icon red">🛡️</span></div>
          <div className="stat-value" style={{ color: '#ff3344' }}>Admin Only</div>
          <div className="stat-foot">Single-Role RBAC Enforced</div>
        </div>
      </div>

      {/* Theme and Preferences */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Interface & Display Preferences</h2>
            <p>Select your preferred dashboard appearance</p>
          </div>
        </div>

        <div className="theme-toggle-row">
          <div>
            <b>Dashboard Color Theme</b>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Currently in <b>{theme === 'light' ? 'Bright / Light Mode' : 'Dark Mode'}</b>.
            </p>
          </div>
          <div className="theme-switch-buttons">
            <button
              className={`button ${theme === 'light' ? 'primary' : 'secondary'}`}
              onClick={() => setTheme('light')}
            >
              ☀ Bright / Light Theme
            </button>
            <button
              className={`button ${theme === 'dark' ? 'primary' : 'secondary'}`}
              onClick={() => setTheme('dark')}
            >
              ☾ Dark Theme
            </button>
          </div>
        </div>
      </div>

      {/* Administrator Governance */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Administrator Directory & Operations Governance</h2>
            <p>Single-Role Access Model: Administrator (Full Operational Clearance, Threshold Governance & Model Switching)</p>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>ADMINISTRATOR</th>
              <th>CORPORATE EMAIL</th>
              <th>CLEARANCE ROLE</th>
              <th>OPERATIONAL SECTOR</th>
              <th>DATA PARTITION</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((m) => (
              <tr key={m.email}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '9px', background: '#ff3344', color: '#fff', fontWeight: 700 }}>
                      {m.avatar}
                    </div>
                    <div>
                      <b>{m.name}</b>
                      <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>{m.status}</small>
                    </div>
                  </div>
                </td>
                <td>{m.email}</td>
                <td>
                  <span className="incident-status red" style={{ fontWeight: 700 }}>
                    ADMINISTRATOR
                  </span>
                </td>
                <td>{m.department}</td>
                <td style={{ fontSize: '11px', color: 'var(--accent-teal)' }}>
                  MongoDB User Scoped ({m.email === 'admin@crowdsense.io' ? 'Primary' : 'Dedicated'})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Log Table */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Administrator Security & Audit Log</h2>
            <p>Immutable record of safety limit modifications and operational actions</p>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>ACTION</th>
              <th>ADMINISTRATOR</th>
              <th>ROLE</th>
              <th>DETAILS</th>
              <th>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'monospace' }}>{log.time}</td>
                <td><strong>{log.action}</strong></td>
                <td>{log.user}</td>
                <td><span className="incident-status red">ADMIN</span></td>
                <td>{log.details}</td>
                <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
