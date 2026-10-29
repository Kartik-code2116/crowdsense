import React from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function ProfilePopover() {
  const { user, showProfileMenu, setShowProfileMenu, logout, token, setPage } = useCrowdStore();

  if (!showProfileMenu || !user) return null;

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      alert('✓ Session JWT copied to clipboard!');
    }
  };

  return (
    <div className="profile-popover-menu">
      <div className="popover-user-card">
        <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '12px', background: '#ff3344', color: '#fff', fontWeight: 700 }}>
          {user.avatar || 'AD'}
        </div>
        <div>
          <b>{user.name}</b>
          <small>{user.email}</small>
          <span className="incident-status red" style={{ marginTop: '4px', display: 'inline-block', fontSize: '10px', letterSpacing: '0.04em' }}>
            VENUE ADMINISTRATOR
          </span>
        </div>
      </div>

      <div className="popover-section">
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Operational Clearance
        </div>
        <div style={{ background: 'var(--surface-sunken)', borderRadius: '8px', padding: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Role:</span>
            <strong style={{ color: '#ff3344' }}>Administrator</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Department:</span>
            <span>{user.department || 'Operations Command'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Data Isolation:</span>
            <span style={{ color: 'var(--accent-teal)' }}>MongoDB User-Scoped</span>
          </div>
        </div>
      </div>

      <div className="popover-section">
        <button className="popover-action-row" onClick={() => { setPage('Landing'); setShowProfileMenu(false); }}>
          <span>🌐 Project Landing Page</span>
          <span>→</span>
        </button>
        <button className="popover-action-row" onClick={() => { setPage('Settings'); setShowProfileMenu(false); }}>
          <span>⚙ Workspace Settings</span>
          <span>→</span>
        </button>
        <button className="popover-action-row" onClick={copyToken}>
          <span>🔑 Copy JWT Token</span>
          <small>RS256</small>
        </button>
      </div>

      <div className="popover-footer">
        <button className="button secondary" style={{ width: '100%', color: '#ff3344' }} onClick={logout}>
          Sign Out of Administrator Console
        </button>
      </div>
    </div>
  );
}
