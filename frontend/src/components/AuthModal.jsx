import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login } = useCrowdStore();
  const [email, setEmail] = useState('admin@crowdsense.io');
  const [password, setPassword] = useState('password123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    const res = await login(email, password);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@crowdsense.io');
    setPassword('password123');
    setErrorMsg('');
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 51, 68, 0.1)', color: '#ff3344', border: '1px solid rgba(255,51,68,0.25)', borderRadius: '12px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
            <span>🛡️</span>
            <span>ADMINISTRATOR CONSOLE CLEARANCE</span>
          </div>
          <h3 style={{ margin: '4px 0 6px' }}>Venue Administrator Authentication</h3>
          <p>Access operations telemetry, zone thresholds, forensic incident logs, and deep learning dispatch.</p>
        </div>

        {/* 1-Click Admin Demo Preset */}
        <div className="role-presets-grid" style={{ gridTemplateColumns: '1fr' }}>
          <button
            type="button"
            className="role-preset-btn active"
            onClick={handleFillDemoAdmin}
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}
          >
            <div>
              <b style={{ color: '#ff3344' }}>Lead Administrator Account</b>
              <small style={{ display: 'block' }}>Alex Kumar · admin@crowdsense.io</small>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(255,51,68,0.15)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
              Auto-Fill
            </span>
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,51,68,0.1)', border: '1px solid #ff3344', borderRadius: '8px', color: '#ff3344', fontSize: '13px' }}>
            ⚠ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label>Administrator Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@crowdsense.io"
            />
          </div>

          <div className="form-group">
            <label>Master Security Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="security-notice">
            <span className="status-dot" style={{ width: '5px', height: '5px' }} />
            <span>Secured via MongoDB bcrypt authentication & JWT RS256 token validation.</span>
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
              {isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
