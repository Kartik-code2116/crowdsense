import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AuthView({ initialMode = 'login' }) {
  const { login, register, setPage, theme, setTheme } = useCrowdStore();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status message
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginEmail) {
      setErrorMsg('Please enter your administrator email address.');
      return;
    }
    setIsSubmitting(true);
    const res = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (res && res.success) {
      setPage('Dashboard');
    } else {
      setErrorMsg(res?.message || 'Invalid administrator credentials. Please check your email and password.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim()) {
      setErrorMsg('Administrator full name is required.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('A valid corporate or institutional email is required.');
      return;
    }
    if (!regOrg.trim()) {
      setErrorMsg('Venue or organization name is required.');
      return;
    }
    if (regPassword.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('You must acknowledge the Safety Protocol & Data Clearance policy.');
      return;
    }

    setIsSubmitting(true);
    const res = await register({
      name: regName,
      email: regEmail,
      organization: regOrg,
      role: 'admin',
      password: regPassword,
      inviteCode
    });
    setIsSubmitting(false);

    if (res && res.success) {
      setSuccessMsg('Account created. Set up a zone and capacity ceiling, then add and configure cameras.');
      setTimeout(() => {
        setPage('Dashboard');
      }, 700);
    } else {
      setErrorMsg(res?.message || 'Registration failed. An administrator with this email may already exist.');
    }
  };

  return (
    <div className="auth-portal-wrapper">
      {/* Background glow and matrix particles */}
      <div className="auth-bg-ambient top-left" />
      <div className="auth-bg-ambient bottom-right" />

      {/* Top Header Bar for Auth */}
      <header className="auth-top-strip">
        <div className="auth-brand" onClick={() => setPage('Landing')} style={{ cursor: 'pointer' }}>
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <span className="brand-title">crowd<strong>sense</strong></span>
            <span className="brand-tag">SAFETY INTELLIGENCE</span>
          </div>
        </div>

        <div className="auth-top-actions">
          <button
            className="landing-theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '☾ Dark Mode' : '☀ Light Mode'}
          </button>
          <button className="auth-back-link" onClick={() => setPage('Landing')}>
            ← Back to Landing Page
          </button>
        </div>
      </header>

      {/* Main Split Authentication Card */}
      <div className="auth-card-container">
        {/* Left Side: Enterprise Safety Context */}
        <div className="auth-context-sidebar">
          <div className="context-header">
            <span className="live-status-pill" style={{ borderColor: '#ff3344', color: '#ff3344', background: 'rgba(255,51,68,0.1)' }}>
              <span className="pulse-dot" style={{ background: '#ff3344' }} />
              ACCOUNT ACCESS
            </span>
            <h2>Administrator Operations & Security Command</h2>
            <p>
              Configure safety zones and cameras, assign a counting model, and review observations and threshold alerts.
            </p>
          </div>

          <div className="context-features">
            <div className="ctx-feature-item">
              <span className="ctx-icon">⚡</span>
              <div>
                <strong>Two supported model backends</strong>
                <p>CSRNet density regression and YOLOv8 person detection, when their weights are installed.</p>
              </div>
            </div>
            <div className="ctx-feature-item">
              <span className="ctx-icon">🛡️</span>
              <div>
                <strong>Single-Role Administrator RBAC</strong>
                <p>Full operational governance over camera streams, safety zones, and incident resolution.</p>
              </div>
            </div>
            <div className="ctx-feature-item">
              <span className="ctx-icon">🔒</span>
              <div>
                <strong>Account-scoped workspace</strong>
                <p>Zones, cameras, detections, and alerts are stored against the signed-in account.</p>
              </div>
            </div>
          </div>

          <div className="context-testimonial">
            <div className="testimonial-quote">
              "Start by setting zone limits, then link each camera and select the model for its scene."
            </div>
            <div className="testimonial-author">
              <strong>CrowdSense setup guide</strong>
              <small>Zones → Cameras → Model assignment</small>
            </div>
          </div>

          <div className="context-footer">
            <span>CSRNet research references</span>
            <span>•</span>
            <span>CSRNet Deep Learning</span>
            <span>•</span>
            <span>MongoDB Data-Scoped</span>
          </div>
        </div>

        {/* Right Side: Interactive Forms */}
        <div className="auth-form-pane">
          {/* Mode Switcher Tabs */}
          <div className="auth-mode-tabs">
            <button
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Administrator Sign In
            </button>
            <button
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Register Administrator
            </button>
          </div>

          {errorMsg && (
            <div className="auth-alert error">
              <span>⚠</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'login' && (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Administrator Corporate / Work Email</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@organization.org"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-with-action">
                  <label>Terminal Password</label>
                  <span
                    className="toggle-pwd-link"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                </div>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <div className="form-row-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                  />
                  <span>Session stays signed in on this device</span>
                </label>
                <span className="forgot-link" title="Contact the workspace administrator to reset your password">Need a password reset?</span>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Authenticating Administrator...' : 'Sign In to Administrator Console'}</span>
                <span className="btn-arrow">→</span>
              </button>

              <p className="diagnostic-note">There is no shared default account. Register with a valid invitation code or use an account created for your workspace.</p>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <div className="form-row-dual">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrap">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Vikram Malhotra"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Corporate / Work Email</label>
                  <div className="input-wrap">
                    <span className="input-icon">✉</span>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="v.malhotra@stadium.org"
                      required
                    />
                  </div>
                </div>
              </div>

              {import.meta.env.PROD && <div className="form-group">
                <label>Administrator Invitation Code</label>
                <div className="input-wrap"><span className="input-icon">🔑</span><input type="password" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoComplete="off" required /></div>
              </div>}

              <div className="form-row-dual">
                <div className="form-group">
                  <label>Venue / Organization Name</label>
                  <div className="input-wrap">
                    <span className="input-icon">🏢</span>
                    <input
                      type="text"
                      value={regOrg}
                      onChange={(e) => setRegOrg(e.target.value)}
                      placeholder="e.g. Metro Transit Command"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Assigned Clearance Role</label>
                  <div className="input-wrap" style={{ background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span className="input-icon" style={{ marginRight: '8px' }}>🛡️</span>
                    <strong style={{ color: '#ff3344', fontSize: '13px' }}>Venue Administrator</strong>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--muted)', background: 'rgba(255,51,68,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      Full Access
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-row-dual">
                <div className="form-group">
                  <label>Password (At least 12 characters)</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create master password"
                      minLength={12}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm master password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-row-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    I acknowledge administrator crowd safety protocols, GDPR camera ingestion policies, and dedicated MongoDB tenant partitioning.
                  </span>
                </label>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Provisioning Administrator...' : 'Create Administrator Account'}</span>
                <span className="btn-arrow">→</span>
              </button>

              <div className="auth-switch-prompt">
                Already registered as an Administrator?{' '}
                <button
                  type="button"
                  className="inline-switch-btn"
                  onClick={() => setMode('login')}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
