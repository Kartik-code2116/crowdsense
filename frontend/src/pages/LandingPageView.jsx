import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function LandingPageView() {
  const { setPage, theme, setTheme, isAuthenticated, user, logout } = useCrowdStore();
  const [activeTab, setActiveTab] = useState('csrnet');
  const [demoView, setDemoView] = useState('heatmap'); // 'raw', 'heatmap', 'targets', 'gradcam'
  const [faqOpen, setFaqOpen] = useState(null);

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const sampleImages = {
    raw: '/samples/stadium_dense.jpg',
    heatmap: '/samples/stadium_dense.jpg',
    targets: '/samples/stadium_dense.jpg',
    gradcam: '/samples/stadium_dense.jpg'
  };

  return (
    <div className="landing-wrapper">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => setPage('Landing')}>
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <div className="brand-text">
              <span className="brand-title">crowd<strong>sense</strong></span>
              <span className="brand-tag">SAFETY INTELLIGENCE</span>
            </div>
          </div>

          <nav className="landing-links">
            <a href="#problem">The Problem</a>
            <a href="#methodology">Density vs YOLO</a>
            <a href="#architecture">Architecture</a>
            <a href="#features">Features</a>
            <a href="#benchmarks">Benchmarks</a>
            <a href="#admin-portal">Admin Portal</a>
            <a href="#viva">Viva Defense</a>
          </nav>

          <div className="landing-nav-actions">
            {/* Theme Toggle */}
            <button
              className="landing-theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '☾ Dark Mode' : '☀ Light Mode'}
            </button>

            {isAuthenticated ? (
              <div className="landing-auth-pill">
                <span className="user-indicator" style={{ color: '#ff3344', fontWeight: 600 }}>
                  ● {user?.name || 'Workspace'}
                </span>
                <button className="landing-btn-secondary" onClick={() => setPage('Dashboard')}>
                  Open Console →
                </button>
                <button className="landing-btn-ghost" onClick={logout} style={{ marginLeft: '4px', padding: '6px 10px', fontSize: '12px' }}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="landing-auth-actions">
                <button className="landing-btn-ghost" onClick={() => setPage('Login')}>
                  Admin Sign In
                </button>
                <button className="landing-btn-primary" onClick={() => setPage('Register')}>
                  Register Admin
                </button>
                <button className="landing-btn-accent" onClick={() => setPage('Login')}>
                  Sign In →
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="landing-hero">
        <div className="hero-glow-sphere top-glow" />
        <div className="hero-glow-sphere bottom-glow" />

        <div className="hero-badge">
          <span className="badge-pulse" style={{ background: '#ff3344' }} />
          <span className="badge-text">Camera-level model assignment · zone capacity monitoring</span>
        </div>

        <h1 className="hero-headline">
          Crowd Monitoring & Capacity Alerts
          <span className="hero-gradient-text"> Powered by Continuous Density Estimation</span>
        </h1>

        <p className="hero-description">
          CrowdSense connects camera sources to capacity-limited zones, runs the selected crowd model, and records
          observations for dashboards and threshold alerts. Choose <strong>CSRNet density regression</strong> or
          <strong> YOLOv8 person detection</strong> for each camera.
        </p>

        <div className="hero-cta-group">
          <button className="hero-btn-primary" onClick={() => setPage(isAuthenticated ? 'Dashboard' : 'Login')}>
            <span>Launch Admin Console</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          <button className="hero-btn-secondary" onClick={() => setPage('Login')}>
            <span>Administrator Portal</span>
            <span className="btn-tag" style={{ background: '#ff3344', color: '#fff' }}>Role: Admin</span>
          </button>

          <button className="hero-btn-outline" onClick={() => setPage(isAuthenticated ? 'Crowd search' : 'Login')}>
            <span>Open Camera Scanner</span>
          </button>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="hero-kpi-ribbon">
          <div className="kpi-card">
            <span className="kpi-num">2</span>
            <span className="kpi-label">Supported model types</span>
            <span className="kpi-sub">CSRNet · YOLOv8</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-num">Measured</span>
            <span className="kpi-label">Inference latency</span>
            <span className="kpi-sub">Reported per sample at runtime</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-num">Observed</span>
            <span className="kpi-label">Trend inputs</span>
            <span className="kpi-sub">Timestamped zone counts</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-num">Per zone</span>
            <span className="kpi-label">Capacity thresholds</span>
            <span className="kpi-sub">Set warning and critical limits</span>
          </div>
        </div>

        {/* 3. INTERACTIVE HERO LIVE SCANNER PREVIEW */}
        <div className="hero-interactive-preview">
          <div className="preview-topbar">
            <div className="preview-indicator">
              <span className="live-dot" />
              <span>ILLUSTRATIVE SAMPLE FRAME · NOT A LIVE CAMERA</span>
            </div>
            <div className="preview-modes">
              <button
                className={demoView === 'raw' ? 'active' : ''}
                onClick={() => setDemoView('raw')}
              >
                1. Raw Feed
              </button>
              <button
                className={demoView === 'heatmap' ? 'active' : ''}
                onClick={() => setDemoView('heatmap')}
              >
                2. Density Heatmap (Jet)
              </button>
              <button
                className={demoView === 'targets' ? 'active' : ''}
                onClick={() => setDemoView('targets')}
              >
                3. Illustrative Markers
              </button>
              <button
                className={demoView === 'gradcam' ? 'active' : ''}
                onClick={() => setDemoView('gradcam')}
              >
                4. Illustrative Overlay
              </button>
            </div>
          </div>

          <div className="preview-viewport">
            <img
              src="/samples/stadium_dense.jpg"
              alt="Illustrative stadium sample frame"
              className="preview-img"
            />

            {/* Illustrative density heatmap sample, not a live model result. */}
            {demoView === 'heatmap' && (
              <div className="preview-overlay real-density-heatmap-overlay">
                <img
                  src="/samples/stadium_dense_heatmap.png"
                  alt="Illustrative CSRNet-style density heatmap sample"
                  className="preview-img-overlay"
                />
              </div>
            )}

            {/* Illustrative markers, not detections from the displayed frame. */}
            {demoView === 'targets' && (
              <div className="preview-overlay target-pins-sim">
                {[
                  { top: '47.5%', left: '55.8%', conf: '98%' },
                  { top: '46.3%', left: '31.7%', conf: '90%' },
                  { top: '47.5%', left: '25.8%', conf: '88%' },
                  { top: '53.8%', left: '35.0%', conf: '88%' },
                  { top: '53.8%', left: '80.0%', conf: '87%' },
                  { top: '51.3%', left: '85.0%', conf: '87%' },
                  { top: '61.3%', left: '44.2%', conf: '86%' },
                  { top: '57.5%', left: '35.8%', conf: '86%' },
                  { top: '56.3%', left: '82.5%', conf: '86%' },
                  { top: '46.3%', left: '70.0%', conf: '85%' },
                  { top: '46.3%', left: '57.5%', conf: '84%' },
                  { top: '50.0%', left: '44.2%', conf: '84%' },
                  { top: '63.8%', left: '42.5%', conf: '83%' },
                  { top: '40.0%', left: '34.2%', conf: '83%' },
                  { top: '57.5%', left: '92.5%', conf: '83%' },
                  { top: '56.3%', left: '41.7%', conf: '83%' },
                  { top: '62.5%', left: '80.0%', conf: '83%' },
                  { top: '51.3%', left: '71.7%', conf: '83%' },
                  { top: '53.8%', left: '25.0%', conf: '82%' },
                  { top: '45.0%', left: '55.8%', conf: '82%' }
                ].map((pos, idx) => (
                  <div key={idx} className="sim-pin" style={{ top: pos.top, left: pos.left }}>
                    <div className="sim-ring" />
                    <div className="sim-dot" />
                    <span className="sim-conf-badge">{pos.conf}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Illustrative density visualization sample, not inference from this frame. */}
            {demoView === 'gradcam' && (
              <div className="preview-overlay real-gradcam-overlay">
                <img
                  src="/samples/stadium_dense_gradcam.png"
                  alt="Illustrative density visualization overlay"
                  className="preview-img-overlay"
                />
              </div>
            )}

            {/* Live Real Telemetry HUD Overlay */}
            <div className="preview-hud">
              <div className="hud-metric">
                <span className="hud-title">MODEL ARCHITECTURE</span>
                <span className="hud-val">PyTorch CSRNet (Dilated Backend)</span>
              </div>
              <div className="hud-metric">
                <span className="hud-title">SAMPLE OUTPUT</span>
                <span className="hud-val highlight">Illustrative only · connect a camera to measure</span>
              </div>
              <div className="hud-metric">
                <span className="hud-title">ZONE CAPACITY CEILING</span>
                <span className="hud-val warning">Configured for each zone</span>
              </div>
              <div className="hud-metric">
                <span className="hud-title">INFERENCE LATENCY</span>
                <span className="hud-val">Measured on each inference request</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Comparing the supported model approaches */}
      <section className="landing-section" id="problem">
        <div className="section-header">
          <span className="section-eyebrow">THE FUNDAMENTAL PROBLEM</span>
          <h2 className="section-title">Choose a counting approach for each camera</h2>
          <p className="section-subtitle">
            Density regression estimates a crowd count from a density map; object detection returns individual person boxes.
            The best choice depends on crowd density, scene conditions, installed weights, and local validation.
          </p>
        </div>

        <div className="problem-comparison-grid">
          {/* Card 1: Object detection */}
          <div className="comparison-card">
            <div className="card-badge blue">YOLOV8 · OBJECT DETECTION</div>
            <h3>Bounding Box Object Detection</h3>
            <ul className="comparison-list">
              <li>
                <strong>Output:</strong> Individual person bounding boxes and confidence scores from the selected YOLOv8 weights.
              </li>
              <li>
                <strong>Useful when:</strong> Operators need localized detections and visual inspection in less crowded views.
              </li>
              <li>
                <strong>Trade-off:</strong> Overlap and small distant people can reduce detection recall; validate on footage from the target venue.
              </li>
              <li>
                <strong>Metric status:</strong> This project has no local YOLOv8 result on the ShanghaiTech test split.
              </li>
            </ul>
            <div className="verdict-box blue-border">
              <span>YOLOV8:</span> Person boxes · requires model weights and venue validation.
            </div>
          </div>

          {/* Card 2: Density map regression */}
          <div className="comparison-card">
            <div className="card-badge green">CROWDSENSE ARCHITECTURE (CSRNET)</div>
            <h3>Continuous Density Map Regression</h3>
            <ul className="comparison-list">
              <li>
                <strong>Output:</strong> A continuous density map whose sum estimates the number of people in the image.
              </li>
              <li>
                <strong>Training idea:</strong> Head-point annotations are converted into density-map targets for supervised learning.
              </li>
              <li>
                <strong>Model choice:</strong> CSRNet is designed for dense scenes where individual people overlap in the image.
              </li>
              <li>
                <strong>Reference result:</strong> The original CSRNet paper reports ShanghaiTech results; installed project weights are not independently evaluated here.
              </li>
            </ul>
            <div className="verdict-box green-border">
              <span>CSRNET:</span> Density map · compare with local ground-truth footage before operational use.
            </div>
          </div>
        </div>
      </section>

      {/* 5. 4-TIER INDUSTRY MICROSERVICES ARCHITECTURE */}
      <section className="landing-section alt-bg" id="architecture">
        <div className="section-header">
          <span className="section-eyebrow">ENGINEERING CHOICES</span>
          <h2 className="section-title">Three services with shared telemetry storage</h2>
          <p className="section-subtitle">
            The browser presents setup and operations views. An Express API manages workspaces, zones, detections, and alerts;
            a Python service runs the selected model. MongoDB stores configuration and observations.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="arch-diagram-wrapper">
          <div className="arch-diagram-grid">
            <div className="arch-tier-box tier-react">
              <div className="tier-header">
                <span className="tier-pill">TIER 1</span>
                <h4>React 18 Dashboard</h4>
                <small>React • Vite • Zustand</small>
              </div>
              <ul className="tier-feats">
                <li>Zone and camera setup</li>
                <li>Camera scanner and multi-camera monitor</li>
                <li>Recorded observations, analytics, and incidents</li>
                <li>CSRNet and YOLOv8 camera assignment</li>
              </ul>
            </div>

            <div className="arch-connector">
              <div className="conn-line" />
              <div className="conn-badge">REST (JWT) + WebSocket</div>
              <div className="conn-line" />
            </div>

            <div className="arch-tier-box tier-node">
              <div className="tier-header">
                <span className="tier-pill">TIER 2</span>
                <h4>Node.js Express API Gateway</h4>
                <small>Auth • Zones • Cameras • Alerts</small>
              </div>
              <ul className="tier-feats">
                <li>Account-scoped API routes</li>
                <li>Network stream sampling worker</li>
                <li>Configurable zone threshold evaluation</li>
                <li>Socket.IO telemetry and alert updates</li>
                <li>CSV exports and printable reports</li>
              </ul>
            </div>

            <div className="arch-connector">
              <div className="conn-line" />
              <div className="conn-badge">Model Tensor Ingestion Pipeline</div>
              <div className="conn-line" />
            </div>

            <div className="arch-tier-box tier-fastapi">
              <div className="tier-header">
                <span className="tier-pill">TIER 3</span>
                <h4>Python AI Service</h4>
                <small>PyTorch • OpenCV • FastAPI</small>
              </div>
              <ul className="tier-feats">
                <li>CSRNet density regression or YOLOv8 detection</li>
                <li>Count and optional model visualizations</li>
                <li>Observed-count trend baseline</li>
                <li>Model weights supplied by operator</li>
              </ul>
            </div>
          </div>

          {/* Time Series Storage Callout */}
          <div className="arch-storage-strip">
            <div className="storage-icon">🗄️</div>
            <div className="storage-info">
                <strong>MongoDB observation storage</strong>
              <span>
                Stores account-owned zones, cameras, alerts, incidents, and timestamped detection records.
              </span>
            </div>
            <div className="storage-tag">Compound Index + TTL</div>
          </div>
        </div>

        {/* Code Snippet Tabs */}
        <div className="code-showcase-box">
          <div className="code-tabs">
            <button
              className={activeTab === 'csrnet' ? 'active' : ''}
              onClick={() => setActiveTab('csrnet')}
            >
              ml/src/models/csrnet.py
            </button>
            <button
              className={activeTab === 'fastapi' ? 'active' : ''}
              onClick={() => setActiveTab('fastapi')}
            >
              ai-service/app/routers/predict.py
            </button>
            <button
              className={activeTab === 'gateway' ? 'active' : ''}
              onClick={() => setActiveTab('gateway')}
            >
              backend/src/services/alertEngine.js
            </button>
            <button
              className={activeTab === 'dataset' ? 'active' : ''}
              onClick={() => setActiveTab('dataset')}
            >
              ml/src/dataset.py (Geometry-Adaptive Gaussian)
            </button>
          </div>

          <div className="code-content">
            {activeTab === 'csrnet' && (
              <pre><code>{`# CSRNet: Dilated Convolutional Neural Network for Crowd Counting
import torch
import torch.nn as nn
from torchvision import models

class CSRNet(nn.Module):
    def __init__(self, load_weights=False):
        super(CSRNet, self).__init__()
        # VGG-16 Frontend: First 10 conv layers feature extractor
        self.frontend = nn.Sequential(...)
        
        # Dilated Backend: 6 conv layers with dilation rate = 2
        # Expands receptive field without pooling to retain spatial resolution
        self.backend = nn.Sequential(
            nn.Conv2d(512, 512, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 512, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 256, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(256, 128, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(128, 64, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
        )
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)

    def forward(self, x):
        feat = self.frontend(x)
        feat = self.backend(feat)
        density_map = self.output_layer(feat)
        return density_map`}</code></pre>
            )}

            {activeTab === 'fastapi' && (
              <pre><code>{`# FastAPI /api/v1/predict - Real PyTorch Density Inference & Peak Extraction
@router.post("/predict")
async def predict_density(file: UploadFile = File(...)):
    image = read_image_from_bytes(await file.read())
    tensor = transform_image(image).to(device)
    
    with torch.no_grad():
        density_map = model(tensor).squeeze().cpu().numpy()
        
    # Mathematical integral is the continuous crowd count
    crowd_count = float(np.sum(density_map))
    
    # Extract local density maximum coordinates for target rings
    head_coords = find_density_peaks(density_map, threshold=0.08)
    
    # Generate high-contrast Jet colormap overlay
    heatmap_base64 = generate_jet_colormap(density_map)
    
    return {
        "count": round(crowd_count, 1),
        "peak_density": float(np.max(density_map)),
        "detected_heads": head_coords,
        "heatmap": heatmap_base64,
        "model": "CSRNet-ShanghaiTech"
    }`}</code></pre>
            )}

            {activeTab === 'gateway' && (
              <pre><code>{`// Node.js Alert Engine: Where Count becomes Crowd Percentage of Capacity
export function evaluateZoneThresholds(zone, liveCount) {
  const occupancyPct = Math.round((liveCount / zone.maxCapacity) * 100);
  
  let severity = 'Normal';
  if (occupancyPct >= zone.criticalPct) {
    severity = 'Critical';
  } else if (occupancyPct >= zone.warningPct) {
    severity = 'Warning';
  }
  
  if (severity !== 'Normal') {
    // Fire real-time notification & persist incident to MongoDB
    broadcastAlert({
      zoneId: zone.id,
      zoneName: zone.name,
      count: liveCount,
      occupancyPct,
      severity,
      timestamp: new Date().toISOString()
    });
  }
  return { occupancyPct, severity };
}`}</code></pre>
            )}

            {activeTab === 'dataset' && (
              <pre><code>{`# ShanghaiTech Geometry-Adaptive Gaussian Ground Truth Generation
# For dense crowds, sigma_i = beta * mean_distance_to_k_nearest_neighbors
def generate_density_map(image_shape, head_points, k=3, beta=0.3):
    density = np.zeros(image_shape, dtype=np.float32)
    tree = scipy.spatial.KDTree(head_points.copy(), leafsize=2048)
    distances, _ = tree.query(head_points, k=k+1)
    
    for i, pt in enumerate(head_points):
        # Average distance to 3 nearest neighbors determines kernel spread
        sigma = distances[i][1:].mean() * beta
        sigma = max(sigma, 1.0)
        kernel = gaussian_filter_density(pt, image_shape, sigma)
        density += kernel
        
    return density`}</code></pre>
            )}
          </div>
        </div>
      </section>

      {/* 6. PLATFORM CAPABILITIES */}
      <section className="landing-section" id="features">
        <div className="section-header">
          <span className="section-eyebrow">CAPABILITIES</span>
          <h2 className="section-title">Production-Grade Intelligence Modules</h2>
          <p className="section-subtitle">
            Engineered to provide real-time situational awareness for venue commanders, safety operators, and compliance auditors.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card" onClick={() => setPage('Crowd search')}>
            <div className="feature-icon">🔍</div>
            <h3>Camera scanner</h3>
            <p>
              Scan the operator webcam, a selected camera, or an uploaded photo. Review the model’s available count,
              detections, and density visualization. One-shot photo scans do not enter live camera history.
            </p>
            <span className="feature-link">Try Photo Scanner →</span>
          </div>

          <div className="feature-card" onClick={() => setPage('Live monitor')}>
            <div className="feature-icon">▦</div>
            <h3>Live camera monitor</h3>
            <p>
              Review configured feeds, source previews, last successful samples, and observed camera counts in one grid.
            </p>
            <span className="feature-link">Open Live Monitor →</span>
          </div>

          <div className="feature-card" onClick={() => setPage('Forecast')}>
            <div className="feature-icon">📈</div>
            <h3>Observed-count trend forecast</h3>
            <p>
              Projects a short trend from recent recorded zone observations. The current app uses a linear baseline;
              it does not claim a trained LSTM forecast.
            </p>
            <span className="feature-link">View Forecast Curve →</span>
          </div>

          <div className="feature-card" onClick={() => setPage('Model lab')}>
            <div className="feature-icon">✳</div>
            <h3>Model outputs for review</h3>
            <p>
              Review the count and available detections or density visualization returned by the selected model.
              Preview overlays on this page are illustrative examples.
            </p>
            <span className="feature-link">Compare model outputs →</span>
          </div>

          <div className="feature-card" onClick={() => setPage('Zones')}>
            <div className="feature-icon">◇</div>
            <h3>Zone capacity management</h3>
            <p>
              Configure a maximum capacity and warning and critical thresholds for each zone. When the recorded estimate
              crosses a threshold, operators receive an alert and incident record.
            </p>
            <span className="feature-link">Manage Zones →</span>
          </div>

          <div className="feature-card" onClick={() => setPage('Incidents')}>
            <div className="feature-icon">⚑</div>
            <h3>Incident review</h3>
            <p>
              Review threshold incidents, their recorded counts and capacities, and a captured source frame when available.
            </p>
            <span className="feature-link">Replay Incidents →</span>
          </div>
        </div>
      </section>

      {/* 7. BENCHMARK COMPARISON TABLE */}
      <section className="landing-section alt-bg" id="benchmarks">
        <div className="section-header">
          <span className="section-eyebrow">MODEL CHOICES</span>
          <h2 className="section-title">Pick the output that fits each camera view</h2>
          <p className="section-subtitle">
            The app supports two inference paths. Accuracy and speed must be measured with the weights and footage used in deployment.
          </p>
        </div>

        <div className="benchmark-table-box">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Type</th>
                <th>Output</th>
                <th>Best suited to</th>
                <th>Evaluation in this project</th>
              </tr>
            </thead>
            <tbody>
              <tr className="highlight-row">
                <td>
                  <strong>CSRNet</strong>
                </td>
                <td>Density map and estimated count</td>
                <td>Dense or overlapping crowds</td>
                <td>Published CSRNet reference values appear in Model Lab; local weights are not benchmarked.</td>
              </tr>
              <tr>
                <td><strong>YOLOv8</strong></td>
                <td>Person boxes and count</td>
                <td>Accuracy depends on checkpoint and scene; validate locally.</td>
              </tr>
              <tr className="failure-row">
                <td><strong>Trend forecast</strong></td>
                <td>Recent zone count history</td>
                <td>Exploratory linear baseline; no trained LSTM is connected.</td>
              </tr>
            </tbody>
          </table>
          <div className="table-caption">
            Use the same labeled camera samples, hardware, and evaluation protocol when comparing models for a deployment.
          </div>
        </div>
      </section>

      {/* 8. 5TH SEMESTER VIVA DEFENSE GUIDE */}
      <section className="landing-section" id="viva">
        <div className="section-header">
          <span className="section-eyebrow">VIVA PREPARATION</span>
          <h2 className="section-title">Viva Defense & Architecture Rationales</h2>
          <p className="section-subtitle">
            Comprehensive explanations for examiners on why this project follows industry-grade microservice standards.
          </p>
        </div>

        <div className="faq-accordion">
          {[
            {
              q: "Why did you build a Python FastAPI microservice instead of running PyTorch inside Node.js?",
              a: "Node.js runs on a single-threaded V8 event loop. While TensorFlow.js or ONNX bindings exist for Node, heavy deep learning backpropagation, tensor manipulation, and GPU CUDA memory allocation belong in Python's native ML ecosystem (PyTorch 2.9, Torchvision, Scipy). Real-world technology companies separate AI inference from the API Gateway to prevent CPU-intensive ML forward passes from freezing concurrent user requests and WebSocket connections."
            },
            {
              q: "How do CSRNet and YOLOv8 differ?",
              a: "YOLOv8 returns individual person boxes. CSRNet predicts a density map whose sum estimates a count. Overlap and small distant people can affect person detection; density estimates depend on the checkpoint and scene. Compare both on labeled footage from the target camera before choosing one."
            },
            {
              q: "What is the mathematical role of dilated convolutions in CSRNet?",
              a: "Standard CNNs use pooling layers to expand the receptive field, but pooling irreversibly destroys high-frequency spatial resolution. CSRNet uses dilated convolutions with dilation rate r=2. This expands the receptive field exponentially without losing spatial details, allowing the backend to differentiate between adjacent crowded heads without subsampling the feature map."
            },
            {
              q: "What is the ShanghaiTech geometry-adaptive Gaussian kernel formula?",
              a: "For congested scenes (Part A), the density map ground truth is generated via: D(x) = sum_i delta(x - x_i) * G_{sigma_i}(x). The spread sigma_i is dynamically determined by the average distance to the k nearest neighbors: sigma_i = beta * (1/k) * sum_{j=1}^k d_{i,j}, with beta = 0.3 and k = 3. This ensures dense clusters have tight, sharp Gaussian peaks while sparse individuals have wider spreads."
            },
            {
              q: "Does the forecast use a trained LSTM?",
              a: "No. The current forecast page fits a transparent linear trend to recent zone observations. It is a prototype for exploration, not a safety guarantee or an automated control system. A trained LSTM would need a prepared dataset, validation, and a deployed checkpoint."
            }
          ].map((item, idx) => (
            <div key={idx} className={`faq-card ${faqOpen === idx ? 'open' : ''}`}>
              <div className="faq-question" onClick={() => toggleFaq(idx)}>
                <span>{item.q}</span>
                <span className="faq-arrow">{faqOpen === idx ? '−' : '＋'}</span>
              </div>
              {faqOpen === idx && <div className="faq-answer">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 9. ADMINISTRATOR COMMAND & ACCESS PORTAL */}
      <section className="landing-section alt-bg" id="admin-portal">
        <div className="section-header">
          <span className="section-eyebrow" style={{ color: '#ff3344' }}>
            WORKSPACE ACCESS
          </span>
          <h2 className="section-title">Single-Role Administrator Safety Command</h2>
          <p className="section-subtitle">
            Sign in to manage account-scoped zones, camera sources, model settings, detections, and incidents.
          </p>
        </div>

        <div className="admin-showcase-grid">
          {/* Card 1: Edge Feed Supervision */}
          <div className="admin-feature-card">
            <div className="admin-card-icon" style={{ background: 'rgba(255, 51, 68, 0.12)', color: '#ff3344' }}>
              📹
            </div>
            <h3>Edge Camera Orchestration</h3>
            <p>
              Direct administrative supervision over RTSP feeds, USB webcams, and pre-recorded high-resolution video streams.
              Live FPS tuning, resolution matrix, and geographic spatial coordinates.
            </p>
            <div className="admin-card-pill">Level 1 Clearance</div>
          </div>

          {/* Card 2: Dynamic Capacity Ceilings */}
          <div className="admin-feature-card">
            <div className="admin-card-icon" style={{ background: 'rgba(255, 170, 0, 0.12)', color: '#ffaa00' }}>
              ⚠️
            </div>
            <h3>Dynamic Zone Ceilings & Alerts</h3>
            <p>
              Set a maximum capacity and warning and critical percentages for each zone. When recent counts cross a threshold,
              CrowdSense records an alert and incident for operator review.
            </p>
              <div className="admin-card-pill">Operator-configured thresholds</div>
          </div>

          {/* Card 3: Forensic Scrubber & Incidents */}
          <div className="admin-feature-card">
            <div className="admin-card-icon" style={{ background: 'rgba(0, 204, 255, 0.12)', color: '#00ccff' }}>
              🛡️
            </div>
            <h3>Forensic Review & Incident Center</h3>
            <p>
              Review recorded threshold incidents, inspect available detection snapshots, resolve incidents,
              and export observation reports.
            </p>
            <div className="admin-card-pill">Audit Dispatch</div>
          </div>

          {/* Card 4: Neural Engine Switching */}
          <div className="admin-feature-card">
            <div className="admin-card-icon" style={{ background: 'rgba(0, 255, 136, 0.12)', color: '#00ff88' }}>
              ⚡
            </div>
            <h3>Deep Learning Backbone Dispatch</h3>
            <p>
              Assign CSRNet or YOLOv8 to each camera and review available model outputs. Accuracy depends on the supplied
              weights and must be validated on local camera footage.
            </p>
            <div className="admin-card-pill">Model Lab Admin</div>
          </div>
        </div>

        {/* Interactive Admin Credentials & Workspace Access Card */}
        <div className="admin-portal-box">
          <div className="admin-portal-info">
            <div className="admin-badge-row">
              <span className="live-status-pill" style={{ borderColor: '#ff3344', color: '#ff3344', background: 'rgba(255,51,68,0.1)' }}>
                <span className="pulse-dot" style={{ background: '#ff3344' }} />
                ACCOUNT-SCOPED WORKSPACE
              </span>
            </div>
            <h3>Administrator Console Access</h3>
            <p>
              Sign in with your workspace credentials or register an account. Production registration requires the invitation code configured by the deployment operator.
            </p>
            <div className="admin-credentials-preview">
              <div className="cred-chip">
                <span className="cred-label">WORKSPACE SETUP</span>
                <strong>Create an account with your configured invite code.</strong>
              </div>
              <div className="cred-chip">
                <span className="cred-label">MODEL WEIGHTS</span>
                <strong>Provide the CSRNet or YOLOv8 checkpoint you plan to evaluate.</strong>
              </div>
            </div>
          </div>

          <div className="admin-portal-actions">
            <button className="landing-btn-primary large" onClick={() => setPage('Login')} style={{ background: '#ff3344', borderColor: '#ff3344' }}>
              Sign In as Administrator →
            </button>
            <button className="landing-btn-secondary large" onClick={() => setPage('Register')}>
              Register New Administrator
            </button>
            <button className="landing-btn-ghost" onClick={() => setPage('Dashboard')} style={{ textAlign: 'center' }}>
              Sign in to open the console
            </button>
          </div>
        </div>
      </section>

      {/* 10. READY TO LAUNCH CALL TO ACTION */}
      <section className="landing-cta-banner">
        <div className="cta-content">
          <h2>Explore CrowdSense</h2>
          <p>
            Connect a camera source, choose a model, and review observed crowd estimates against zone limits.
          </p>
          <div className="cta-buttons">
            <button className="landing-btn-primary large" onClick={() => setPage(isAuthenticated ? 'Dashboard' : 'Login')}>
              Open workspace
            </button>
            <button className="landing-btn-secondary large" onClick={() => setPage('Register')}>
              Register Administrator Account
            </button>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-col">
            <div className="landing-brand">
              <div className="brand-mark">
                <span />
                <span />
                <span />
              </div>
              <div className="brand-text">
                <span className="brand-title">crowd<strong>sense</strong></span>
                <span className="brand-tag">SAFETY INTELLIGENCE</span>
              </div>
            </div>
            <p className="footer-desc">
              A prototype for connecting camera estimates with zone capacity thresholds and operator review.
            </p>
            <div className="footer-credits">
              5th Semester Deep Learning & Distributed Systems Engineering Project.
            </div>
          </div>

          <div className="footer-col">
            <h5>Navigation</h5>
            <button onClick={() => setPage(isAuthenticated ? 'Dashboard' : 'Login')}>Dashboard</button>
            <button onClick={() => setPage(isAuthenticated ? 'Live monitor' : 'Login')}>Live Monitor</button>
            <button onClick={() => setPage(isAuthenticated ? 'Crowd search' : 'Login')}>Camera Scanner</button>
            <button onClick={() => setPage('Model lab')}>Model Lab</button>
            <button onClick={() => setPage('Forecast')}>Trend Forecast</button>
          </div>

          <div className="footer-col">
            <h5>Architecture</h5>
            <a href="#problem">Why Detection Fails</a>
            <a href="#methodology">Density Integral vs YOLO</a>
            <a href="#architecture">Service architecture</a>
            <a href="#benchmarks">Model choices</a>
            <a href="#admin-portal">Single-Role RBAC Model</a>
            <a href="#viva">Viva Q&A Defense</a>
          </div>

          <div className="footer-col">
            <h5>Administrator Access</h5>
            <button onClick={() => setPage('Login')}>Administrator Sign In</button>
            <button onClick={() => setPage('Register')}>Register Administrator</button>
            <button onClick={() => setPage('Settings')}>System Settings</button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 CrowdSense Platform. All rights reserved.</span>
          <span className="footer-meta">PyTorch CSRNet • Dilated Conv • Node.js Gateway • MongoDB User-Scoped Time-Series</span>
        </div>
      </footer>
    </div>
  );
}
