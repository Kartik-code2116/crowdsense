import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AuthView({ initialMode = 'login' }) {
  const { login, register, setPage, theme, setTheme } = useCrowdStore();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@crowdsense.io');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [loginRole, setLoginRole] = useState('admin');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regRole, setRegRole] = useState('operator');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status message
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginEmail) {
      setErrorMsg('Please enter your organizational email address.');
      return;
    }
    login(loginEmail, loginPassword, loginRole);
    setPage('Dashboard');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regName.trim()) {
      setErrorMsg('Full name is required.');
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

    register({
      name: regName,
      email: regEmail,
      organization: regOrg,
      role: regRole,
      password: regPassword
    });

    setSuccessMsg('Account provisioned successfully! Accessing control room...');
    setTimeout(() => {
      setPage('Dashboard');
    }, 600);
  };

  const demoAccounts = [
    { role: 'admin', label: 'Venue Admin', name: 'Alex Kumar', email: 'admin@crowdsense.io', color: '#ff3344', desc: 'Full permissions & threshold management' },
    { role: 'operator', label: 'Shift Operator', name: 'Sarah Jenkins', email: 'operator@crowdsense.io', color: '#00ffcc', desc: 'Live monitoring & incident escalation' },
    { role: 'analyst', label: 'Safety Analyst', name: 'David Chen', email: 'analyst@crowdsense.io', color: '#ffaa00', desc: 'Compliance reports & model benchmarking' },
    { role: 'viewer', label: 'Executive Viewer', name: 'Elena Rostova', email: 'viewer@crowdsense.io', color: '#4488ff', desc: 'Read-only venue capacity overview' }
  ];

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
            <span className="live-status-pill">
              <span className="pulse-dot" />
              EDGE NETWORK SECURE
            </span>
            <h2>Operations Access & Safety Dispatch</h2>
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
              <span className="ctx-icon">🔒</span>
              <div>
                <strong>Role-Based Access Control</strong>
                <p>Granular operational clearance for operators, analysts & commanders.</p>
              </div>
            </div>
            <div className="ctx-feature-item">
              <span className="ctx-icon">📈</span>
              <div>
                <strong>CrowdFlowLSTM Predictive Warning</strong>
                <p>8-to-15 minute advance notice before capacity bottlenecks occur.</p>
              </div>
            </div>
          </div>

          <div className="context-testimonial">
            <div className="testimonial-quote">
              "Continuous density integrals solved our severe occlusion challenges where bounding boxes completely failed."
            </div>
            <div className="testimonial-author">
              <strong>National Stadium Operations Directorate</strong>
              <small>Shift 02 Safety Command</small>
            </div>
          </div>

          <div className="context-footer">
            <span>ShanghaiTech Calibrated</span>
            <span>•</span>
            <span>FastAPI Microservice</span>
            <span>•</span>
            <span>MongoDB TTL</span>
          </div>
        </div>

        {/* Right Side: Interactive Forms */}
        <div className="auth-form-pane">
          {/* Mode Switcher Tabs */}
          <div className="auth-mode-tabs">
            <button
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setErrorMsg(''); }}
            >
              Sign In to Console
            </button>
            <button
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setErrorMsg(''); }}
            >
              Register Account
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
                <label>Institutional / Work Email</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="operator@crowdsense.io"
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
                  <span>Remember this workstation session</span>
                </label>
                <a href="#forgot" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('For local demo, select any of the 1-Click test credentials below.'); }}>
                  Forgot password?
                </a>
              </div>

              <button type="submit" className="auth-submit-btn">
                <span>Sign In to Operations Console</span>
                <span className="btn-arrow">→</span>
              </button>

              {/* 1-Click Role Login Quick Selectors */}
              <div className="quick-roles-divider">
                <span>OR 1-CLICK TEST CREDENTIALS</span>
              </div>

              <div className="quick-roles-grid">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    className={`quick-role-card ${loginRole === acc.role ? 'selected' : ''}`}
                    onClick={() => {
                      setLoginRole(acc.role);
                      setLoginEmail(acc.email);
                      login(acc.email, 'password', acc.role);
                      setPage('Dashboard');
                    }}
                  >
                    <div className="role-top">
                      <span className="role-chip" style={{ color: acc.color, borderColor: `${acc.color}44` }}>
                        {acc.label}
                      </span>
                    </div>
                    <strong>{acc.name}</strong>
                    <small>{acc.desc}</small>
                  </button>
                ))}
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
                  <label>Operational Role</label>
                  <div className="input-wrap">
                    <span className="input-icon">🛡️</span>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="auth-select"
                    >
                      <option value="operator">Safety Operator (Live Monitoring)</option>
                      <option value="admin">Venue Administrator (Full Management)</option>
                      <option value="analyst">Safety Analyst (Reports & Benchmarks)</option>
                      <option value="viewer">Executive Observer (Read-Only)</option>
                    </select>
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
                      placeholder="Create password"
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
                      placeholder="Confirm password"
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
                    I acknowledge venue crowd safety monitoring protocols, GDPR/privacy camera ingestion policies, and internal audit procedures.
                  </span>
                </label>
              </div>

              <button type="submit" className="auth-submit-btn">
                <span>Create Enterprise Account</span>
                <span className="btn-arrow">→</span>
              </button>

              <div className="auth-switch-prompt">
                Already registered?{' '}
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
