import React from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function ProfilePopover() {
  const { user, showProfileMenu, setShowProfileMenu, logout, switchRole, token, setPage } = useCrowdStore();

  if (!showProfileMenu || !user) return null;

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    alert('✓ Session JWT copied to clipboard!');
  };

  return (
    <div className="profile-popover-menu">
      <div className="popover-user-card">
        <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '12px' }}>
          {user.avatar}
        </div>
        <div>
          <b>{user.name}</b>
          <small>{user.email}</small>
          <span className={`incident-status ${user.role === 'admin' ? 'red' : user.role === 'operator' ? 'amber' : 'green'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
            {user.role.toUpperCase()} ROLE
          </span>
        </div>
      </div>

      <div className="popover-section">
        <div className="popover-label">SWITCH RBAC ROLE</div>
        <div className="popover-role-switch">
          {['admin', 'operator', 'analyst', 'viewer'].map((r) => (
            <button
              key={r}
              className={`role-chip ${user.role === r ? 'active' : ''}`}
              onClick={() => switchRole(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="popover-section">
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
        <button className="button secondary" style={{ width: '100%', color: '#d9565e' }} onClick={logout}>
          Sign Out of Venue Console
        </button>
      </div>
    </div>
  );
}
