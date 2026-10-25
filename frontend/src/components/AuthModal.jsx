import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, user } = useCrowdStore();
  const [email, setEmail] = useState('admin@crowdsense.io');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      login(email, password, selectedRole);
      setIsSubmitting(false);
    }, 400);
  };

  const handleSelectRolePreset = (role, defaultEmail) => {
    setSelectedRole(role);
    setEmail(defaultEmail);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content auth-modal">
        <div className="modal-header">
          <div className="brand" style={{ padding: 0 }}>
            <div className="brand-mark" style={{ width: '28px', height: '28px' }}>
              <span /><span /><span />
            </div>
            <b>crowd<span>sense</span></b>
          </div>
          <button className="close-btn" onClick={() => setShowAuthModal(false)}>✕</button>
        </div>

        <div className="auth-header-copy">
          <h3>Venue Operator Authentication</h3>
          <p>Sign in with your enterprise credentials or choose an RBAC test role:</p>
        </div>

        {/* 1-Click Role Presets */}
        <div className="role-presets-grid">
          <button
            type="button"
            className={`role-preset-btn ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => handleSelectRolePreset('admin', 'admin@crowdsense.io')}
          >
            <b>Admin Lead</b>
            <small>Full Platform Access</small>
          </button>
          <button
            type="button"
            className={`role-preset-btn ${selectedRole === 'operator' ? 'active' : ''}`}
            onClick={() => handleSelectRolePreset('operator', 'operator@crowdsense.io')}
          >
            <b>Live Operator</b>
            <small>Feeds & Incidents</small>
          </button>
          <button
            type="button"
            className={`role-preset-btn ${selectedRole === 'analyst' ? 'active' : ''}`}
            onClick={() => handleSelectRolePreset('analyst', 'analyst@crowdsense.io')}
          >
            <b>Safety Analyst</b>
            <small>Analytics & Reports</small>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label>Operator Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="security-notice">
            <span className="status-dot" style={{ width: '5px', height: '5px' }} />
            <span>Secured via JWT RS256 token authentication with RBAC policy enforcement.</span>
          </div>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowAuthModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : `Sign in as ${selectedRole.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
