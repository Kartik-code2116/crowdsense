import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AuthView({ initialMode = 'login' }) {
  const { login, register, setPage, theme, setTheme } = useCrowdStore();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@crowdsense.io');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
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
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
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
      password: regPassword
    });
    setIsSubmitting(false);

    if (res && res.success) {
      setSuccessMsg('Administrator account provisioned in MongoDB! Initializing dedicated command workspace...');
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
              ADMINISTRATOR CLEARANCE LEVEL 1
            </span>
            <h2>Administrator Operations & Security Command</h2>
            <p>
              Autonomous real-time crowd density estimation, early warning alerts, and live CCTV telemetry
              powered by PyTorch CSRNet continuous density regression.
            </p>
          </div>

          <div className="context-features">
            <div className="ctx-feature-item">
              <span className="ctx-icon">⚡</span>
              <div>
                <strong>38.4 ms Model Inference</strong>
                <p>Dilated convolution backend without subsampling loss.</p>
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
                <strong>MongoDB Isolated Workspaces</strong>
                <p>Every administrator manages a dedicated, isolated data partition with zero cross-contamination.</p>
              </div>
            </div>
          </div>

          <div className="context-testimonial">
            <div className="testimonial-quote">
              "Continuous density integrals solved our severe occlusion challenges where bounding boxes completely failed."
            </div>
            <div className="testimonial-author">
              <strong>National Stadium Operations Directorate</strong>
              <small>Lead Administrator Security Command</small>
            </div>
          </div>

          <div className="context-footer">
            <span>ShanghaiTech Calibrated</span>
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
                    placeholder="admin@crowdsense.io"
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
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember this administrator terminal session</span>
                </label>
                <a href="#forgot" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('Default credentials: admin@crowdsense.io / password123'); }}>
                  Forgot password?
                </a>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Authenticating Administrator...' : 'Sign In to Administrator Console'}</span>
                <span className="btn-arrow">→</span>
              </button>

              {/* 1-Click Administrator Credentials Quick Selector */}
              <div className="quick-roles-divider">
                <span>OR 1-CLICK VERIFIED ADMINISTRATOR TEST ACCESS</span>
              </div>

              <div className="quick-roles-grid" style={{ gridTemplateColumns: '1fr' }}>
                <button
                  type="button"
                  className="quick-role-card selected"
                  onClick={async () => {
                    setLoginEmail('admin@crowdsense.io');
                    setLoginPassword('password123');
                    setIsSubmitting(true);
                    const res = await login('admin@crowdsense.io', 'password123');
                    setIsSubmitting(false);
                    if (res && res.success) {
                      setPage('Dashboard');
                    }
                  }}
                  style={{ textAlign: 'left', borderColor: 'rgba(255,51,68,0.3)', background: 'rgba(255,51,68,0.05)' }}
                >
                  <div className="role-top">
                    <span className="role-chip" style={{ color: '#ff3344', borderColor: '#ff334444' }}>
                      VENUE ADMINISTRATOR
                    </span>
                    <small style={{ color: '#ff3344', fontWeight: 600 }}>1-Click Instant Sign In →</small>
                  </div>
                  <strong>Alex Kumar (Primary Admin)</strong>
                  <small>admin@crowdsense.io · Full Platform &amp; Model Controls</small>
                </button>
              </div>
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
                  <label>Password (Min. 6 chars)</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create master password"
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
