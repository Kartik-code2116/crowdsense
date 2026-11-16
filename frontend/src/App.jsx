import React, { lazy, Suspense, useEffect } from 'react';
import { useCrowdStore } from './store/useCrowdStore';
const LandingPageView = lazy(() => import('./pages/LandingPageView'));
const AuthView = lazy(() => import('./pages/AuthView'));
const DashboardView = lazy(() => import('./pages/DashboardView'));
const LiveMonitorView = lazy(() => import('./pages/LiveMonitorView'));
const AnalyticsView = lazy(() => import('./pages/AnalyticsView'));
const CamerasView = lazy(() => import('./pages/CamerasView'));
const ZonesView = lazy(() => import('./pages/ZonesView'));
const IncidentsView = lazy(() => import('./pages/IncidentsView'));
const ForecastView = lazy(() => import('./pages/ForecastView'));
const ModelLabView = lazy(() => import('./pages/ModelLabView'));
const ReportsView = lazy(() => import('./pages/ReportsView'));
const SandboxView = lazy(() => import('./pages/SandboxView'));
const SettingsView = lazy(() => import('./pages/SettingsView'));
const PhotoScannerView = lazy(() => import('./pages/PhotoScannerView'));

const PageLoading = () => <div role="status" style={{ padding: 32, color: 'var(--muted)' }}>Loading page…</div>;

import AuthModal from './components/AuthModal';
import ProfilePopover from './components/ProfilePopover';
import NotificationsDrawer from './components/NotificationsDrawer';
import AddCameraModal from './components/AddCameraModal';
import TelemetryDock from './components/TelemetryDock';

import {
  LayoutDashboard,
  Video,
  BarChart3,
  Camera,
  Layers,
  AlertTriangle,
  FileText,
  ScanSearch,
  TrendingUp,
  Cpu,
  FlaskConical,
  Settings,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';

const navGroups = [
  {
    label: 'SETUP',
    items: [
      { id: 'Zones', label: '1. Zones & Capacity', icon: Layers },
      { id: 'Cameras', label: '2. Cameras', icon: Camera },
      { id: 'Model lab', label: '3. Models', icon: Cpu }
    ]
  },
  {
    label: 'MONITOR',
    items: [
      { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'Live monitor', label: 'All Cameras', icon: Video },
      { id: 'Crowd search', label: 'Camera Scanner', icon: ScanSearch },
      { id: 'Incidents', label: 'Incidents', icon: AlertTriangle, hasCounter: true }
    ]
  },
  {
    label: 'INSIGHTS',
    items: [
      { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'Forecast', label: 'Trend forecast', icon: TrendingUp }
    ]
  }
];

const menuTitles = {
  Dashboard: 'Operations Overview & Live Telemetry',
  'Live monitor': 'Live Camera Multi-Monitor & Telemetry',
  Analytics: 'Crowd Intelligence & Throughput Analytics',
  Cameras: 'Edge Camera Management & RTSP Feeds',
  Zones: 'Safety Zones & Capacity Ceiling Management',
  Incidents: 'Incident and Alert Review',
  'Crowd search': 'Camera and Image Crowd Scanner',
  Forecast: 'Crowd Trend Projection',
  'Model lab': 'Model Lab · CSRNet and YOLOv8',
  Reports: 'Observed Crowd Reports',
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
    return <Suspense fallback={<PageLoading />}><LandingPageView /></Suspense>;
  }

  if (page === 'Login') {
    return <Suspense fallback={<PageLoading />}><AuthView initialMode="login" /></Suspense>;
  }

  if (page === 'Register') {
    return <Suspense fallback={<PageLoading />}><AuthView initialMode="register" /></Suspense>;
  }

  // Every operations page is private, including a page restored from stale local state.
  if (!isAuthenticated) {
    return <Suspense fallback={<PageLoading />}><AuthView initialMode="login" /></Suspense>;
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
        <div className="brand" onClick={() => setPage('Dashboard')} style={{ cursor: 'pointer' }} title="CrowdSense Operations Dashboard">
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
          <ChevronDown size={14} className="chevron-icon" />
        </div>

        <nav>
          {navGroups.map((group) => (
            <section key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = page === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setPage(item.id)}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      <IconComponent size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    </span>
                    <span>{item.label}</span>
                    {item.hasCounter && activeIncidents > 0 && <em>{activeIncidents}</em>}
                    {item.badge && (
                      <span className={`micro-badge ${item.badgeClass || ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="profile"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Open Account & RBAC menu"
          >
            <div className="avatar">{user ? user.avatar : 'AK'}</div>
            <div className="profile-details">
              <b>{user ? user.name : 'Sign In'}</b>
              <small>{user ? `${user.department || user.role}` : 'Unauthenticated'}</small>
            </div>
            <MoreHorizontal size={18} className="profile-dots" />
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
            <div
              className="live-pill"
              style={{
                background: dbConnected ? undefined : 'rgba(224, 85, 85, 0.15)',
                borderColor: dbConnected ? undefined : '#e05555',
                color: dbConnected ? undefined : '#e05555'
              }}
              title={`Database: ${dbConnected ? 'connected' : 'unavailable'} · AI service: ${aiConnected ? 'available' : 'unavailable'}`}
            >
              <i style={{ background: dbConnected && aiConnected ? undefined : '#db9225' }} />
              {dbConnected && aiConnected ? 'SERVICES READY' : 'SERVICE DEGRADED'}
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
                {new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} <span className="heading-dot">•</span> OPERATIONS
              </div>
              <h1>
                {page === 'Dashboard' && user ? `Welcome back, ${user.name}` : menuTitles[page] || page}
                <span className="wave">{page === 'Dashboard' ? ' 👋' : ''}</span>
              </h1>
              <p>
                {page === 'Dashboard'
                  ? 'Review configured zones, connected cameras, observed crowd counts, and threshold incidents.'
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
          <Suspense fallback={<PageLoading />}>{renderActivePage()}</Suspense>
        </div>
      </main>

      {/* Global Interactive Modals & Drawers */}
      <AuthModal />
      <ProfilePopover />
      <NotificationsDrawer />
      <AddCameraModal />
      <TelemetryDock />
    </div>
  );
}
