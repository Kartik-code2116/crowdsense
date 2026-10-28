import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function SettingsView() {
  const { theme, setTheme } = useCrowdStore();

  const teamMembers = [
    { name: 'Alex Kumar', email: 'alex.kumar@crowdsense.io', role: 'admin', department: 'Venue Operations Lead', avatar: 'AK' },
    { name: 'Sarah Jenkins', email: 's.jenkins@crowdsense.io', role: 'operator', department: 'Control Room Shift 02', avatar: 'SJ' },
    { name: 'David Chen', email: 'd.chen@crowdsense.io', role: 'analyst', department: 'Safety Compliance Analyst', avatar: 'DC' },
    { name: 'Elena Rostova', email: 'e.rostova@crowdsense.io', role: 'viewer', department: 'Executive Director', avatar: 'ER' }
  ];

  const auditLogs = [
    { action: 'Threshold Modified', user: 'Alex Kumar', role: 'admin', details: 'Zone 02 critical limit set to 90%', time: '14:10:15', ip: '192.168.1.12' },
    { action: 'Model Switched', user: 'Alex Kumar', role: 'admin', details: 'Switched primary backbone to CSRNet v1.2.0', time: '13:45:00', ip: '192.168.1.12' },
    { action: 'Incident Resolved', user: 'Sarah Jenkins', role: 'operator', details: 'Marked INC-2026-087 as resolved', time: '13:56:12', ip: '192.168.1.18' },
    { action: 'Camera Reconnected', user: 'System Worker', role: 'system', details: 'CAM-03 stream re-initialized at 2.0 FPS', time: '13:02:18', ip: '127.0.0.1' }
  ];

  return (
    <div className="settings-view-container">
      <div className="page-action-row">
        <div>
          <h2>System Health, RBAC & Workspace Configuration</h2>
          <p>Microservice status, team role-based permissions, and operator audit trail</p>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="stat-grid" style={{ marginTop: '16px' }}>
        <div className="stat-card">
          <div className="stat-top"><span>NODE.JS API GATEWAY</span><span className="stat-icon green">✓</span></div>
          <div className="stat-value text-green">Online</div>
          <div className="stat-foot">Port 5000 · Uptime: 3,420s</div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>CSRNET DEEP LEARNING MODEL</span><span className="stat-icon blue">⚡</span></div>
          <div className="stat-value text-blue">38.4 <small>ms</small></div>
          <div className="stat-foot">PyTorch Dilated Conv · ShanghaiTech</div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>TIME-SERIES DATABASE</span><span className="stat-icon amber">⛁</span></div>
          <div className="stat-value">Active</div>
          <div className="stat-foot">TTL Index: 7-day auto-purge</div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>SOCKET.IO REAL-TIME</span><span className="stat-icon green">●</span></div>
          <div className="stat-value text-green">Synced</div>
          <div className="stat-foot">Broadcasting live telemetry</div>
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

      {/* RBAC Team Management */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Role-Based Access Control (RBAC) Team Members</h2>
            <p>Access hierarchy: Admin &gt; Operator &gt; Analyst &gt; Viewer</p>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>DEPARTMENT</th>
              <th>PERMISSIONS</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((m) => (
              <tr key={m.email}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '9px' }}>{m.avatar}</div>
                    <b>{m.name}</b>
                  </div>
                </td>
                <td>{m.email}</td>
                <td>
                  <span className={`incident-status ${m.role === 'admin' ? 'red' : m.role === 'operator' ? 'amber' : 'green'}`}>
                    {m.role.toUpperCase()}
                  </span>
                </td>
                <td>{m.department}</td>
                <td style={{ fontSize: '10px' }}>
                  {m.role === 'admin' ? 'Full Control + Model Switch' : m.role === 'operator' ? 'Live Feeds + Incident Resolution' : 'Read-only Analytics'}
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
            <h2>Operator Security & Audit Log</h2>
            <p>Immutable record of safety limit modifications and operational actions</p>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>ACTION</th>
              <th>USER</th>
              <th>ROLE</th>
              <th>EVENT DETAILS</th>
              <th>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.time}</td>
                <td><b>{log.action}</b></td>
                <td>{log.user}</td>
                <td><span className="badge-pill">{log.role}</span></td>
                <td>{log.details}</td>
                <td><code style={{ fontSize: '10px' }}>{log.ip}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
