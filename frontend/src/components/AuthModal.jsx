import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login } = useCrowdStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h3 style={{ margin: '4px 0 6px' }}>Sign in to CrowdSense</h3>
          <p>Open your workspace to manage zones, camera streams, models, and crowd alerts.</p>
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
              placeholder="you@organization.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
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
            <span>Use the account credentials created for this workspace.</span>
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
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
