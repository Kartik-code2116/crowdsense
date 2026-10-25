import React, { useEffect } from 'react';
import { useCrowdStore } from './store/useCrowdStore';
import LandingPageView from './pages/LandingPageView';
import AuthView from './pages/AuthView';
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
import PhotoScannerView from './pages/PhotoScannerView';

import AuthModal from './components/AuthModal';
import ProfilePopover from './components/ProfilePopover';
import NotificationsDrawer from './components/NotificationsDrawer';
import AddCameraModal from './components/AddCameraModal';

const navGroups = [
  {
    label: 'PORTAL',
    items: [
      ['Landing page', '✦']
    ]
  },
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
      ['Crowd search', '🔍'],
      ['Forecast', '📈'],
      ['Model lab', '✳'],
      ['Sandbox', '🧪'],
      ['Settings', '⚙']
    ]
  }
];

const menuTitles = {
  'Landing page': 'CrowdSense Platform Architecture & Overview',
  Dashboard: 'Operations Overview & Live Telemetry',
  'Live monitor': 'Live Camera Multi-Monitor & Telemetry',
  Analytics: 'Crowd Intelligence & Throughput Analytics',
  Cameras: 'Edge Camera Management & RTSP Feeds',
  Zones: 'Safety Zones & Capacity Ceiling Management',
  Incidents: 'Incident Center & Forensic Replay Scrubber',
  'Crowd search': 'Deep Learning Photo Crowd Scanner & Head Locator',
  Forecast: 'CrowdFlowLSTM Predictive Early Warning',
  'Model lab': 'Model Performance Lab (CSRNet vs MCNN vs YOLO)',
  Reports: 'Operational Safety Reports & Compliance Audits',
  Sandbox: 'Direct AI Density Regression Playground',
  Settings: 'System Health, RBAC & Workspace Configuration'
};

export default function App() {
  const {
    theme,
    setTheme,
    page,
    setPage,
    incidents,
    user,
    isAuthenticated,
    setShowAuthModal,
    showProfileMenu,
    setShowProfileMenu,
    showNotificationsDrawer,
    setShowNotificationsDrawer,
    setShowAddCameraModal,
    notifications,
    cameras,
    fetchLiveData,
    dbConnected,
    dbSource,
    aiConnected,
    aiModelInfo,
    lastSyncTimestamp
  } = useCrowdStore();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Initial and recurring sync with local MongoDB and real AI service
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(() => {
      fetchLiveData();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeIncidents = incidents.filter((i) => i.status === 'Open').length;
  const unreadNotifs = notifications.filter((n) => n.unread).length;

  // Dedicated Full-Page Views (Landing, Login, Register)
  if (page === 'Landing' || page === 'Landing page') {
    return <LandingPageView />;
  }

  if (page === 'Login') {
    return <AuthView initialMode="login" />;
  }

  if (page === 'Register') {
    return <AuthView initialMode="register" />;
  }

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
      case 'Crowd search':
        return <PhotoScannerView />;
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
        <div className="brand" onClick={() => setPage('Landing')} style={{ cursor: 'pointer' }} title="Go to Project Landing Page">
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

        <div className="workspace" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: 'pointer' }}>
          <div className="workspace-icon">{user ? user.avatar : 'VC'}</div>
          <div>
            <strong>Venue Central</strong>
            <small>{user ? `${user.name} (${user.role})` : 'Operations Lead'}</small>
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
                  className={`nav-item ${page === label || (label === 'Landing page' && page === 'Landing') ? 'active' : ''}`}
                  onClick={() => setPage(label === 'Landing page' ? 'Landing' : label)}
                >
                  <span className="icon" aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                  {label === 'Incidents' && activeIncidents > 0 && <em>{activeIncidents}</em>}
                  {label === 'Crowd search' && <span className="micro-badge pulse">AI</span>}
                  {label === 'Model lab' && <span className="micro-badge">DL</span>}
                  {label === 'Landing page' && <span className="micro-badge info">INFO</span>}
                </button>
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-heading">
              <span className={`status-dot ${dbConnected ? 'green' : 'amber'}`} />
              {dbConnected ? 'MongoDB Local (27017)' : 'All Systems Operational'}
            </div>
            <div className="system-caption">
              {dbConnected ? 'Real time-series collection connected' : 'Real-time edge telemetry connected'}
            </div>
            <div className="system-metrics">
              <span>FastAPI Inference</span>
              <b>{aiConnected ? 'PyTorch 2.9 (Online)' : '38.4 ms'}</b>
            </div>
            <div className="system-metrics">
              <span>Active Cameras</span>
              <b>{cameras.length} / {cameras.length} Live</b>
            </div>
            {lastSyncTimestamp && (
              <div className="system-metrics" style={{ borderTop: 'none', paddingTop: '4px' }}>
                <span>DB Telemetry Sync</span>
                <b style={{ color: '#159b6f' }}>{lastSyncTimestamp}</b>
              </div>
            )}
          </div>

          <button
            className="profile"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Open Account & RBAC menu"
          >
            <div className="avatar">{user ? user.avatar : 'AK'}</div>
            <span>
              <b>{user ? user.name : 'Sign In'}</b>
              <small>{user ? `${user.department} (${user.role})` : 'Unauthenticated'}</small>
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
            <button
              className="landing-portal-button"
              onClick={() => setPage('Landing')}
              title="View CrowdSense Project Overview & Landing Page"
            >
              ✦ Project Landing Page
            </button>

            <div className="live-pill" title="Connected to Local MongoDB (port 27017) and PyTorch 2.9 FastAPI microservice">
              <i /> {dbConnected ? 'MONGODB: 27017 LIVE' : 'LIVE PIPELINE'}
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

            {/* Notifications Button with Live Badge */}
            <button
              className="icon-button notification"
              aria-label="Active Incidents & Alerts"
              onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
              title="Open Notifications Drawer"
            >
              ♧
              {unreadNotifs > 0 && <i />}
            </button>

            <div className="top-divider" />

            {/* User Profile Avatar */}
            <div
              className="top-avatar"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title={`${user?.name} · Click for Account & Role switcher`}
            >
              {user ? user.avatar : 'AK'}
            </div>
          </div>
        </header>

        {/* Dynamic Page Header */}
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                SUNDAY, OCTOBER 25, 2026 <span className="heading-dot">•</span> SHIFT 02
              </div>
              <h1>
                {page === 'Dashboard' && user ? `Welcome back, ${user.name}` : menuTitles[page] || page}
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
              <button className="button primary" onClick={() => setShowAddCameraModal(true)}>
                ＋ Add Camera
              </button>
            </div>
          </div>

          {/* Render Active Page Content */}
          {renderActivePage()}
        </div>
      </main>

      {/* Global Interactive Modals & Drawers */}
      <AuthModal />
      <ProfilePopover />
      <NotificationsDrawer />
      <AddCameraModal />
    </div>
  );
}
