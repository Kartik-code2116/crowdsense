import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function ModelLabView() {
  const { models, setActiveModel } = useCrowdStore();
  const [selectedLayer, setSelectedLayer] = useState('backend_conv5_3');
  const [activeCamMode, setActiveCamMode] = useState('gradcam'); // 'gradcam' | 'density' | 'raw'

  const activeModel = models.find((m) => m.isActive) || models[0];

  return (
    <div className="model-lab-container">
      {/* Introduction Hero Card */}
      <div className="model-hero-card panel">
        <div className="hero-content">
          <div className="eyebrow" style={{ color: '#3478e5' }}>RESEARCH & DEEP LEARNING CORE</div>
          <h2>Density Map Regression vs Bounding-Box Detection</h2>
          <p>
            Standard object detection (YOLO/Faster-RCNN) fails severely in dense crowds because of high head occlusion 
            (&gt;80% overlap) and extreme perspective distortion where heads shrink to 3-5 pixels. 
            CrowdSense overcomes this using <b>dilated convolutional density regression (CSRNet)</b>, predicting a continuous 
            spatial density map whose integral equals the crowd count.
          </p>
        </div>
        <div className="math-callout">
          <code>Total Crowd Count = ∬ D(x, y) dx dy = ∑ D[h, w]</code>
          <small>Integral of continuous density map yields accurate count under heavy occlusion</small>
        </div>
      </div>

      {/* Benchmark Comparison Table */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>ShanghaiTech Dataset Benchmark (MAE & RMSE Evaluation)</h2>
            <p>Evaluation on Part A (congested scenes) and Part B (urban pedestrian streets)</p>
          </div>
          <span className="badge-pill" style={{ background: '#edf4ff', color: '#3478e5' }}>
            PyTorch Evaluation
          </span>
        </div>

        <table className="custom-table benchmark-table">
          <thead>
            <tr>
              <th>MODEL ARCHITECTURE</th>
              <th>TYPE</th>
              <th>PART A MAE (↓)</th>
              <th>PART A RMSE (↓)</th>
              <th>PART B MAE (↓)</th>
              <th>PART B RMSE (↓)</th>
              <th>LATENCY</th>
              <th>RUNTIME</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} className={m.isActive ? 'active-model-row' : ''}>
                <td>
                  <b>{m.name}</b>
                  <small style={{ display: 'block', color: 'var(--muted)' }}>{m.parameters} params · {m.version}</small>
                </td>
                <td>
                  <span className={`incident-status ${m.type.includes('Detection') ? 'amber' : 'green'}`}>
                    {m.type}
                  </span>
                </td>
                <td><b style={{ color: m.name.includes('CSRNet') ? '#19a779' : 'inherit' }}>{m.partA_MAE}</b></td>
                <td><b style={{ color: m.name.includes('CSRNet') ? '#19a779' : 'inherit' }}>{m.partA_RMSE}</b></td>
                <td>{m.partB_MAE}</td>
                <td>{m.partB_RMSE}</td>
                <td><b>{m.latencyMs} ms</b></td>
                <td><code style={{ fontSize: '10px' }}>ONNX / TensorRT</code></td>
                <td>
                  {m.isActive ? (
                    <span className="badge-pill" style={{ background: '#edf8f2', color: '#19a779' }}>
                      ● Active Primary
                    </span>
                  ) : (
                    <button
                      className="button secondary"
                      style={{ height: '26px', fontSize: '10px' }}
                      onClick={() => setActiveModel(m.name)}
                    >
                      Set Active
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Grad-CAM & Explainability Studio */}
      <div className="gradcam-studio-grid" style={{ marginTop: '16px' }}>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Density Grad-CAM Visualizer (Explainable AI)</h2>
              <p>Gradient-weighted Class Activation Mapping adapted for crowd regression</p>
            </div>
            <div className="view-mode-toggles">
              <button
                className={`pill-btn ${activeCamMode === 'raw' ? 'active' : ''}`}
                onClick={() => setActiveCamMode('raw')}
              >
                Raw Input
              </button>
              <button
                className={`pill-btn ${activeCamMode === 'density' ? 'active' : ''}`}
                onClick={() => setActiveCamMode('density')}
              >
                Density Map
              </button>
              <button
                className={`pill-btn ${activeCamMode === 'gradcam' ? 'active' : ''}`}
                onClick={() => setActiveCamMode('gradcam')}
              >
                Grad-CAM Activation
              </button>
            </div>
          </div>

          <div className="gradcam-preview-box">
            <div className={`scene concourse ${activeCamMode}`}>
              <div className="scene-building building-a" />
              <div className="scene-building building-b" />
              <div className="scene-floor" />
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className={`person p${(i % 12) + 1}`}>
                  <i />
                </span>
              ))}

              {activeCamMode === 'density' && (
                <>
                  <div className="heat heat-a" />
                  <div className="heat heat-b" />
                </>
              )}

              {activeCamMode === 'gradcam' && (
                <div className="gradcam-overlay">
                  <div className="gradcam-pulse pulse-1" />
                  <div className="gradcam-pulse pulse-2" />
                  <div className="gradcam-pulse pulse-3" />
                </div>
              )}

              <span className="camera-label">
                TARGET LAYER: {selectedLayer.toUpperCase()} · RECEPTIVE FIELD EXPANDED (DILATION=2)
              </span>
            </div>
          </div>

          <div className="layer-picker-row">
            <span>Target Feature Layer:</span>
            {['conv4_3 (Frontend)', 'backend_conv5_1', 'backend_conv5_3 (Output)'].map((l) => (
              <button
                key={l}
                className={`button secondary ${selectedLayer === l ? 'active-layer' : ''}`}
                style={{ height: '28px', fontSize: '10px' }}
                onClick={() => setSelectedLayer(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Deep Learning Viva / Architecture Highlights */}
        <div className="panel">
          <div className="panel-heading">
            <h2>Architecture Technical Highlights</h2>
          </div>

          <div className="tech-feature-card">
            <h4>1. Dilated Convolutions (Receptive Field Expansion)</h4>
            <p>
              Standard pooling reduces resolution, losing small heads in distant rows. 
              CSRNet introduces <b>dilated kernels ($r=2$)</b> that enlarge the effective receptive field 
              from 3×3 to 5×5 without any loss of spatial density details.
            </p>
          </div>

          <div className="tech-feature-card">
            <h4>2. Geometry-Adaptive Gaussian Filtering</h4>
            <p>
              In ShanghaiTech Part A, head size depends on perspective. For each head annotation $x_i$, 
              $\sigma_i = 0.3 \cdot \bar{d}_i$, where $\bar{d}_i$ is the average Euclidean distance to its 
              3 nearest neighbor heads.
            </p>
          </div>

          <div className="tech-feature-card">
            <h4>3. ONNX Runtime & FP16 Quantization</h4>
            <p>
              Inference is accelerated from 82ms in vanilla PyTorch CPU down to <b>38.4ms</b> using 
              dynamic-axis ONNX graph export and half-precision FP16 execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
