import React from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import { Activity, Camera, Database, Layers, Moon, Sun, UserRound, Cpu } from 'lucide-react';

function HealthCard({ label, value, detail, ready, icon: Icon }) {
  return (
    <article className="stat-card">
      <div className="stat-top"><span>{label}</span><span className={`stat-icon ${ready ? 'green' : 'amber'}`}><Icon size={16} /></span></div>
      <div className="stat-value" style={{ fontSize: 19 }}>{value}</div>
      <div className="stat-foot">{detail}</div>
    </article>
  );
}

export default function SettingsView() {
  const { theme, setTheme, user, dbConnected, dbSource, aiConnected, aiModelInfo, zones, cameras, incidents, lastSyncTimestamp } = useCrowdStore();
  const liveCameras = cameras.filter((camera) => camera.status === 'Live').length;
  const openIncidents = incidents.filter((incident) => incident.status === 'Open').length;

  return (
    <div className="settings-view-container">
      <div className="page-action-row">
        <div>
          <h2>Workspace settings</h2>
          <p>Service health, account details, and display preferences</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <HealthCard label="DATABASE" value={dbConnected ? 'Connected' : dbSource || 'Unavailable'} detail={lastSyncTimestamp ? `Last sync ${lastSyncTimestamp}` : 'Waiting for API health check'} ready={dbConnected} icon={Database} />
        <HealthCard label="AI INFERENCE" value={aiConnected ? 'Available' : 'Unavailable'} detail={aiModelInfo || 'No model status received'} ready={aiConnected} icon={Cpu} />
        <HealthCard label="CAMERAS" value={`${liveCameras} live · ${cameras.length} total`} detail="A feed becomes Live after a successful AI sample" ready={cameras.length > 0 && liveCameras === cameras.length} icon={Camera} />
        <HealthCard label="OPEN INCIDENTS" value={String(openIncidents)} detail="Created when an observed zone count crosses its configured threshold" ready={openIncidents === 0} icon={Activity} />
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-heading">
          <div><h2>Appearance</h2><p>Choose the display theme for this browser</p></div>
        </div>
        <div className="theme-toggle-row">
          <div><b>Color theme</b><p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>Current: {theme === 'light' ? 'Light' : 'Dark'}</p></div>
          <div className="theme-switch-buttons">
            <button className={`button ${theme === 'light' ? 'primary' : 'secondary'}`} onClick={() => setTheme('light')}><Sun size={15} /> Light</button>
            <button className={`button ${theme === 'dark' ? 'primary' : 'secondary'}`} onClick={() => setTheme('dark')}><Moon size={15} /> Dark</button>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-heading"><div><h2>Signed-in account</h2><p>Data shown here is scoped to the current account</p></div></div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
            <span className="avatar">{user.avatar || user.name?.slice(0, 2)?.toUpperCase() || 'U'}</span>
            <div><b>{user.name}</b><small style={{ display: 'block', color: 'var(--muted)' }}>{user.email} · {user.role || 'operator'}{user.department ? ` · ${user.department}` : ''}</small></div>
          </div>
        ) : <p style={{ color: 'var(--muted)' }}><UserRound size={15} /> No account is signed in.</p>}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-heading"><div><h2>Workspace inventory</h2><p>Current configuration for this account</p></div></div>
        <div className="stat-grid">
          <div className="telemetry-card"><div className="metric-row"><span><Layers size={14} /> Zones</span><b>{zones.length}</b></div></div>
          <div className="telemetry-card"><div className="metric-row"><span><Camera size={14} /> Cameras</span><b>{cameras.length}</b></div></div>
          <div className="telemetry-card"><div className="metric-row"><span><Activity size={14} /> Open incidents</span><b>{openIncidents}</b></div></div>
        </div>
        <div className="diagnostic-note" style={{ marginTop: 14 }}>
          <b>Operational note</b>
          <p style={{ marginBottom: 0 }}>CrowdSense records model observations and compares zone totals with the limits you configure. It does not provide regulatory certification or replace an on-site safety plan.</p>
        </div>
      </section>
    </div>
  );
}
