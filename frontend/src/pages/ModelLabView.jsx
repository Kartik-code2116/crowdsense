import React, { useState, useEffect } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import { apiClient } from '../api/client';

export default function ModelLabView() {
  const { models, setActiveModel } = useCrowdStore();
  const [selectedLayer, setSelectedLayer] = useState('backend_conv5_3');
  const [activeCamMode, setActiveCamMode] = useState('gradcam'); // 'gradcam' | 'density' | 'raw'
  const [activeImageSrc, setActiveImageSrc] = useState('/samples/stadium_dense.jpg');
  const [gradcamOverlayUrl, setGradcamOverlayUrl] = useState(null);
  const [densityOverlayUrl, setDensityOverlayUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real PyTorch Grad-CAM and Density Map
  useEffect(() => {
    async function fetchModelExplainability() {
      setIsLoading(true);
      try {
        const resp = await fetch(activeImageSrc);
        const blob = await resp.blob();

        // 1. Fetch real PyTorch Grad-CAM
        const gradcamRes = await apiClient.explainGradCam(blob, selectedLayer);
        if (gradcamRes && gradcamRes.gradcam_data_url) {
          setGradcamOverlayUrl(gradcamRes.gradcam_data_url);
        }

        // 2. Fetch real PyTorch Density Map
        const predictRes = await apiClient.predictImage(blob, 'csrnet', 300);
        if (predictRes && predictRes.heatmap_data_url) {
          setDensityOverlayUrl(predictRes.heatmap_data_url);
        }
      } catch (err) {
        console.warn('Explainability load notice:', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchModelExplainability();
  }, [activeImageSrc, selectedLayer]);

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
                <td><code style={{ fontSize: '12.5px' }}>ONNX / TensorRT</code></td>
                <td>
                  {m.isActive ? (
                    <span className="badge-pill" style={{ background: '#edf8f2', color: '#19a779', fontSize: '11.5px', padding: '4px 10px' }}>
                      ● Active Primary
                    </span>
                  ) : (
                    <button
                      className="button secondary"
                      style={{ height: '32px', fontSize: '12px', padding: '0 12px' }}
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

      {/* Real Density Grad-CAM & Explainability Studio */}
      <div className="gradcam-studio-grid" style={{ marginTop: '16px' }}>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Density Grad-CAM Visualizer (PyTorch Backpropagation)</h2>
              <p>Gradient-weighted Class Activation Mapping adapted for continuous regression: d(Count)/dA_k</p>
            </div>
            <div className="view-mode-toggles">
              <button
                className={`pill-btn ${activeCamMode === 'raw' ? 'active' : ''}`}
                onClick={() => setActiveCamMode('raw')}
              >
                Raw Photo
              </button>
              <button
                className={`pill-btn ${activeCamMode === 'density' ? 'active' : ''}`}
                onClick={() => setActiveCamMode('density')}
              >
                Density Heatmap
              </button>
              <button
                className={`pill-btn ${activeCamMode === 'gradcam' ? 'active' : ''}`}
                onClick={() => setActiveCamMode('gradcam')}
              >
                Grad-CAM Activation
              </button>
            </div>
          </div>

          {/* Genuine Crowd Photo + Real Neural Activation Overlay */}
          <div className="gradcam-preview-box" style={{ position: 'relative', height: '320px', borderRadius: '8px', overflow: 'hidden', background: '#0d131a' }}>
            <img
              src={activeImageSrc}
              alt="Real Crowd Scene"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />

            {/* Real Density Map Overlay */}
            {activeCamMode === 'density' && densityOverlayUrl && (
              <img
                src={densityOverlayUrl}
                alt="PyTorch Density Map"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  mixBlendMode: 'screen',
                  opacity: 0.8
                }}
              />
            )}

            {/* Real PyTorch Grad-CAM Activation Overlay */}
            {activeCamMode === 'gradcam' && gradcamOverlayUrl && (
              <img
                src={gradcamOverlayUrl}
                alt="PyTorch Grad-CAM Activation Map"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  mixBlendMode: 'screen',
                  opacity: 0.85
                }}
              />
            )}

            <div style={{ position: 'absolute', left: '10px', top: '10px', background: 'rgba(12, 20, 28, 0.85)', padding: '5px 9px', borderRadius: '5px', fontSize: '9.5px', color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
              TARGET LAYER: <span style={{ color: '#00ffcc', fontWeight: '700' }}>{selectedLayer.toUpperCase()}</span> (DILATION FACTOR r=2)
            </div>
          </div>

          <div className="layer-picker-row" style={{ marginTop: '12px' }}>
            <span style={{ fontWeight: '700' }}>Backpropagate Gradient Into:</span>
            {['conv4_3 (Frontend)', 'backend_conv5_1', 'backend_conv5_3 (Output)'].map((l) => (
              <button
                key={l}
                className={`button secondary ${selectedLayer === l.split(' ')[0] ? 'active-layer' : ''}`}
                style={{ height: '28px', fontSize: '10px' }}
                onClick={() => setSelectedLayer(l.split(' ')[0])}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="sample-switch-row" style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: '700' }}>Test Photo:</span>
            <button
              className={`pill-btn ${activeImageSrc.includes('stadium') ? 'active' : ''}`}
              onClick={() => setActiveImageSrc('/samples/stadium_dense.jpg')}
            >
              Dense Stadium
            </button>
            <button
              className={`pill-btn ${activeImageSrc.includes('street') ? 'active' : ''}`}
              onClick={() => setActiveImageSrc('/samples/street_pedestrians.jpg')}
            >
              Pedestrian Street
            </button>
            <button
              className={`pill-btn ${activeImageSrc.includes('mall') ? 'active' : ''}`}
              onClick={() => setActiveImageSrc('/samples/mall_concourse.jpg')}
            >
              Mall Atrium
            </button>
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
            <h4>3. Real PyTorch Density Grad-CAM Formula</h4>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', background: 'var(--surface)', padding: '6px', borderRadius: '4px' }}>
              α_k = (1/Z) ∑_i ∑_j [∂(Total Count) / ∂A_k(i, j)]<br />
              L_CAM = ReLU(∑_k α_k · A_k)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
