import React, { useEffect } from 'react';
import { useCrowdStore } from './store/useCrowdStore';
import DashboardView from './pages/DashboardView';
import LiveMonitorView from './pages/LiveMonitorView';
import AnalyticsView from './pages/AnalyticsView';
import CamerasView from './pages/CamerasView';
import ZonesView from './pages/ZonesView';
import IncidentsView from './pages/IncidentsView';
import ForecastView from './pages/ForecastView';
import ModelLabView from './pages/ModelLabView';
import ReportsView from './pages/ReportsView';
import SandboxView from './pages/SandboxView';
import SettingsView from './pages/SettingsView';

const navGroups = [
  {
    label: 'OVERVIEW',
    items: [
      ['Dashboard', '⌂'],
      ['Live monitor', '▦'],
      ['Analytics', '⌁']
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      ['Cameras', '◉'],
      ['Zones', '◇'],
      ['Incidents', '⚑'],
      ['Reports', '▤']
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      ['Forecast', '📈'],
      ['Model lab', '✳'],
      ['Sandbox', '🧪'],
      ['Settings', '⚙']
    ]
  }
];

const menuTitles = {
  Dashboard: 'Good afternoon, Operator',
  'Live monitor': 'Live Camera Multi-Monitor & Telemetry',
  Analytics: 'Crowd Intelligence & Throughput Analytics',
  Cameras: 'Edge Camera Management & RTSP Feeds',
  Zones: 'Safety Zones & Capacity Ceiling Management',
  Incidents: 'Incident Center & Forensic Replay Scrubber',
  Forecast: 'CrowdFlowLSTM Predictive Early Warning',
  'Model lab': 'Model Performance Lab (CSRNet vs MCNN vs YOLO)',
  Reports: 'Operational Safety Reports & Compliance Audits',
  Sandbox: 'Direct AI Density Regression Playground',
  Settings: 'System Health, RBAC & Workspace Configuration'
};

export default function App() {
  const { theme, setTheme, page, setPage, incidents } = useCrowdStore();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const activeIncidents = incidents.filter((i) => i.status === 'Open').length;

  const renderActivePage = () => {
    switch (page) {
      case 'Dashboard':
        return <DashboardView />;
      case 'Live monitor':
        return <LiveMonitorView />;
      case 'Analytics':
        return <AnalyticsView />;
      case 'Cameras':
        return <CamerasView />;
      case 'Zones':
        return <ZonesView />;
      case 'Incidents':
        return <IncidentsView />;
      case 'Forecast':
        return <ForecastView />;
      case 'Model lab':
        return <ModelLabView />;
      case 'Reports':
        return <ReportsView />;
      case 'Sandbox':
        return <SandboxView />;
      case 'Settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-shell">
      {/* Industry Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <b>crowd<span>sense</span></b>
            <small>SAFETY INTELLIGENCE</small>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-icon">VC</div>
          <div>
            <strong>Venue Central</strong>
            <small>Operations Lead · Shift 02</small>
          </div>
          <span className="chevron">⌄</span>
        </div>

        <nav>
          {navGroups.map((group) => (
            <section key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(([label, icon]) => (
                <button
                  key={label}
                  className={`nav-item ${page === label ? 'active' : ''}`}
                  onClick={() => setPage(label)}
                >
                  <span className="icon" aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                  {label === 'Incidents' && activeIncidents > 0 && <em>{activeIncidents}</em>}
                  {label === 'Model lab' && <span className="micro-badge">DL</span>}
                  {label === 'Forecast' && <span className="micro-badge pulse">AI</span>}
                </button>
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-heading">
              <span className="status-dot" />
              All Systems Operational
            </div>
            <div className="system-caption">Real-time edge telemetry connected</div>
            <div className="system-metrics">
              <span>FastAPI Inference</span>
              <b>38.4 ms</b>
            </div>
            <div className="system-metrics">
              <span>Active Cameras</span>
              <b>6 / 6 Live</b>
            </div>
          </div>

          <button className="profile" onClick={() => setPage('Settings')}>
            <div className="avatar">AK</div>
            <span>
              <b>Alex Kumar</b>
              <small>Operations Lead (Admin)</small>
            </span>
            <span className="profile-dots">···</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Venue Central</span>
            <b>/</b>
            <strong>{page}</strong>
          </div>

          <div className="top-actions">
            <div className="live-pill">
              <i /> LIVE PIPELINE
            </div>

            {/* Bright / Light & Dark Theme Toggle Button */}
            <button
              className="icon-button theme-button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>

            <button
              className="icon-button notification"
              aria-label="Active Incidents"
              onClick={() => setPage('Incidents')}
            >
              ♧
              {activeIncidents > 0 && <i />}
            </button>

            <div className="top-divider" />
            <div className="top-avatar" onClick={() => setPage('Settings')} title="Profile Settings">
              AK
            </div>
          </div>
        </header>

        {/* Dynamic Page Header & Router Container */}
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                SUNDAY, OCTOBER 25, 2026 <span className="heading-dot">•</span> SHIFT 02
              </div>
              <h1>
                {menuTitles[page] || page}
                <span className="wave">{page === 'Dashboard' ? ' 👋' : ''}</span>
              </h1>
              <p>
                {page === 'Dashboard'
                  ? 'Real-time density estimation, capacity thresholds, and proactive LSTM crowd forecasting.'
                  : `Monitor, inspect, and configure ${page.toLowerCase()} across your enterprise venue.`}
              </p>
            </div>

            <div className="heading-actions">
              <button className="button secondary" onClick={() => setPage('Reports')}>
                ↓ Export Report
              </button>
              <button className="button primary" onClick={() => setPage('Cameras')}>
                ＋ Add Camera
              </button>
            </div>
          </div>

          {/* Render Active Tab Component */}
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
}
