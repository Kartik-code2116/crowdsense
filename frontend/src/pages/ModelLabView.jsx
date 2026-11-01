import React, { useState, useEffect } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import { apiClient } from '../api/client';

/**
 * ModelLabView — Comprehensive Deep Learning Course Project Showcase
 *
 * Displays:
 * 1. Hero card: Density map regression explanation
 * 2. AI Service Status Banner
 * 3. CSRNet Architecture Deep Dive (always visible, even offline)
 * 4. Full Benchmark Table (MAE/RMSE on ShanghaiTech)
 * 5. Training Configuration Details
 * 6. Grad-CAM Visualizer (requires AI service)
 * 7. Model Weights Info
 */
export default function ModelLabView() {
  const { models, setActiveModel, aiConnected, aiModelInfo } = useCrowdStore();
  const [selectedLayer, setSelectedLayer] = useState('backend_conv5_3');
  const [activeCamMode, setActiveCamMode] = useState('gradcam'); // 'gradcam' | 'density' | 'raw'
  const [activeImageSrc, setActiveImageSrc] = useState('/samples/stadium_dense.jpg');
  const [gradcamOverlayUrl, setGradcamOverlayUrl] = useState(null);
  const [densityOverlayUrl, setDensityOverlayUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real PyTorch Grad-CAM and Density Map only when AI is online
  useEffect(() => {
    if (!aiConnected) {
      setGradcamOverlayUrl(null);
      setDensityOverlayUrl(null);
      return;
    }

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
  }, [activeImageSrc, selectedLayer, aiConnected]);

  return (
    <div className="model-lab-container">

      {/* ── Section 1: Introduction Hero Card ── */}
      <div className="model-hero-card panel">
        <div className="hero-content">
          <div className="eyebrow" style={{ color: '#3478e5' }}>RESEARCH &amp; DEEP LEARNING CORE</div>
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

      {/* ── Section 2: AI Service Status Banner ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        background: aiConnected
          ? 'linear-gradient(90deg, rgba(25, 167, 121, 0.10), rgba(52, 120, 229, 0.07))'
          : 'linear-gradient(90deg, rgba(224, 85, 85, 0.12), rgba(219, 146, 37, 0.07))',
        border: `1px solid ${aiConnected ? '#19a779' : '#e05555'}`,
        borderRadius: '8px',
        padding: '14px 18px',
        marginTop: '16px'
      }}>
        <span style={{ fontSize: '22px', marginTop: '2px' }}>{aiConnected ? '✅' : '⚠️'}</span>
        <div style={{ flex: 1 }}>
          {aiConnected ? (
            <>
              <b style={{ color: '#19a779', fontSize: '14px' }}>● AI Service Online — CSRNet Model Server Running</b>
              <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 0' }}>
                {aiModelInfo || 'CSRNet Dilated Conv (PyTorch)'} is active on localhost:8000. Live Grad-CAM activations and
                density maps are being computed in real time from genuine PyTorch backpropagation.
              </p>
            </>
          ) : (
            <>
              <b style={{ color: '#e05555', fontSize: '14px' }}>⚠ AI Service Offline — The CSRNet model server (localhost:8000) is not running</b>
              <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 0' }}>
                Live Grad-CAM visualizations require the AI backend. Architecture information and benchmark tables below
                are static reference data and are always available. Start <code>python ai_service/main.py</code> to enable live inference.
              </p>
            </>
          )}
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 10px',
          borderRadius: '12px',
          background: aiConnected ? 'rgba(25, 167, 121, 0.15)' : 'rgba(224, 85, 85, 0.15)',
          color: aiConnected ? '#19a779' : '#e05555',
          whiteSpace: 'nowrap'
        }}>
          {aiConnected ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      {/* ── Section 3: CSRNet Architecture Deep Dive ── */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>CSRNet Architecture — VGG-16 Frontend + Dilated Backend</h2>
            <p>Two-stage convolutional network: shared VGG-16 feature extraction + dilated regression backend</p>
          </div>
          <span className="badge-pill" style={{ background: '#edf4ff', color: '#3478e5' }}>
            PyTorch · 16.26M Parameters
          </span>
        </div>

        {/* Architecture Diagram */}
        <div style={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '20px 24px',
          overflowX: 'auto',
          lineHeight: '1.7',
          color: 'var(--text)'
        }}>
          <div style={{ color: '#3478e5', fontWeight: '700', marginBottom: '12px', fontSize: '13px' }}>CSRNet Architecture</div>
          <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit', background: 'none' }}>{`INPUT IMAGE (3 × H × W)
    ↓
┌─────────────────────────────────────────────────────────┐
│  FRONTEND — VGG-16 (Shared Weights, First 13 Conv Layers│
│  Pretrained on ImageNet-1K for rich semantic features)  │
│                                                         │
│  conv1_1(64, 3×3) → ReLU → conv1_2(64, 3×3) → ReLU   │
│                     → MaxPool2D(2×2, stride=2)          │
│  conv2_1(128,3×3) → ReLU → conv2_2(128,3×3) → ReLU   │
│                     → MaxPool2D(2×2, stride=2)          │
│  conv3_1(256,3×3) → ReLU → conv3_2(256,3×3) → ReLU   │
│  conv3_3(256,3×3) → ReLU → MaxPool2D(2×2, stride=2)   │
│  conv4_1(512,3×3) → ReLU → conv4_2(512,3×3) → ReLU   │
│  conv4_3(512,3×3) → ReLU (MaxPool OMITTED to preserve  │
│                     spatial resolution for density map) │
│                                                         │
│  Output: Feature Map  (512 × H/8 × W/8)                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│  BACKEND — Dilated Convolutions (dilation rate r = 2)   │
│  Expands receptive field without spatial downsampling   │
│  Effective receptive field: 3×3 → 5×5 (no stride loss) │
│                                                         │
│  conv5_1 (512 ch, 3×3, d=2, pad=2) → BatchNorm → ReLU │
│  conv5_2 (512 ch, 3×3, d=2, pad=2) → BatchNorm → ReLU │
│  conv5_3 (512 ch, 3×3, d=2, pad=2) → BatchNorm → ReLU │
│  conv6_1 (256 ch, 3×3, d=2, pad=2) → BatchNorm → ReLU │
│  conv6_2 (128 ch, 3×3, d=2, pad=2) → BatchNorm → ReLU │
│  conv6_3 ( 64 ch, 3×3, d=2, pad=2) → BatchNorm → ReLU │
└─────────────────────────────────────────────────────────┘
    ↓
  conv_out (1 ch, 1×1) — Linear projection to scalar density
    ↓
OUTPUT: Density Map  D  (1 × H/8 × W/8)

  Total Count  C = ΣΣ D[h, w]   (sum over all spatial cells)
  Loss (MSE): L = (1/N) Σ ||D_pred - D_gt||²`}</pre>
        </div>

        {/* Dilated Conv Explanation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '16px' }}>
          <div className="tech-feature-card">
            <h4>Why Dilated Convolutions?</h4>
            <p>
              Standard MaxPool would further halve spatial resolution, making it impossible to distinguish
              individual heads in congested regions. Dilated conv (r=2) doubles the effective receptive field
              from 3×3 to a 5×5 region — capturing broader context while preserving every spatial cell for
              the density map output.
            </p>
          </div>
          <div className="tech-feature-card">
            <h4>Geometry-Adaptive Gaussian Ground Truth</h4>
            <p>
              For each head annotation <code>x_i</code>, a 2D Gaussian is placed with adaptive sigma:
              <br/><code>σᵢ = 0.3 × d̄ᵢ</code>
              <br/>where <code>d̄ᵢ</code> is the average Euclidean distance to the 3 nearest neighbor heads.
              Farther heads (background rows) get wider Gaussians; front-row heads get tighter ones.
            </p>
          </div>
          <div className="tech-feature-card">
            <h4>Grad-CAM for Regression</h4>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', background: 'var(--surface)', padding: '8px', borderRadius: '4px' }}>
              α_k = (1/Z) Σᵢ Σⱼ [∂(Count) / ∂A_k(i,j)]<br/>
              L_CAM = ReLU(Σ_k α_k · A_k)
            </p>
            <p style={{ marginTop: '6px' }}>
              Gradient of the <em>scalar crowd count</em> (sum of density map) w.r.t. feature maps A_k
              of any backend conv layer. Visualizes which image regions the model relies on for counting.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 4: Complete Benchmark Table ── */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>ShanghaiTech Dataset Benchmark (MAE &amp; RMSE Evaluation)</h2>
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

      {/* ── Section 5: Training Configuration ── */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>CSRNet Training Configuration</h2>
            <p>Exact hyperparameters and dataset used to train the crowd counting model</p>
          </div>
          <span className="badge-pill" style={{ background: '#fff8ec', color: '#db9225' }}>
            ShanghaiTech Dataset
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Dataset Card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', color: '#3478e5', fontSize: '13px' }}>📂 Dataset — ShanghaiTech</h4>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Dataset', 'ShanghaiTech Part A + Part B'],
                  ['Part A — Train', '300 images (congested scenes)'],
                  ['Part A — Test', '182 images'],
                  ['Part B — Train', '400 images (pedestrian streets)'],
                  ['Part B — Test', '316 images'],
                  ['Annotation', 'Point annotation per head'],
                  ['Count Range (Part A)', '33 – 3,139 people/image'],
                  ['Count Range (Part B)', '9 – 578 people/image'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: 'var(--muted)', paddingRight: '12px' }}>{k}</td>
                    <td style={{ padding: '4px 0', fontWeight: '600' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Optimizer & Training Card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', color: '#19a779', fontSize: '13px' }}>⚙ Optimizer &amp; Training</h4>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Optimizer', 'SGD'],
                  ['Learning Rate', '1e-6'],
                  ['Momentum', '0.95'],
                  ['Weight Decay', '5e-4'],
                  ['Epochs', '400'],
                  ['Batch Size', '1 (full-resolution)'],
                  ['Loss Function', 'MSE (Euclidean Loss)'],
                  ['Loss Target', 'Predicted density map vs. Gaussian GT'],
                  ['Platform', 'PyTorch 2.x · CUDA / CPU'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: 'var(--muted)', paddingRight: '12px' }}>{k}</td>
                    <td style={{ padding: '4px 0', fontWeight: '600' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ground Truth Generation Card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', color: '#db9225', fontSize: '13px' }}>🎯 Ground Truth Density Map Generation</h4>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Method', 'Geometry-Adaptive Gaussian'],
                  ['Formula', 'σᵢ = 0.3 × d̄ᵢ'],
                  ['d̄ᵢ', 'Avg. dist to 3 nearest head annotations'],
                  ['Kernel', '2D Isotropic Gaussian per head point'],
                  ['Output size', 'H/8 × W/8 (CSRNet downsamples 8×)'],
                  ['Normalization', 'Each Gaussian sums to 1'],
                  ['Total sum', 'Equals ground-truth person count'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 0', color: 'var(--muted)', paddingRight: '12px' }}>{k}</td>
                    <td style={{ padding: '4px 0', fontWeight: '600', fontFamily: v.includes('σ') || v.includes('d̄') ? 'monospace' : 'inherit' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section 6: Grad-CAM Visualizer ── */}
      <div className="gradcam-studio-grid" style={{ marginTop: '16px' }}>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Density Grad-CAM Visualizer (PyTorch Backpropagation)</h2>
              <p>Gradient-weighted Class Activation Mapping adapted for continuous regression: d(Count)/dA_k</p>
            </div>
            {aiConnected && (
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
            )}
          </div>

          {/* Main Preview Box */}
          {aiConnected ? (
            <>
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

                {isLoading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,20,30,0.7)', fontSize: '13px', color: '#fff' }}>
                    ⟳ Computing PyTorch gradients…
                  </div>
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
                  Dense Stadium (Real Crowd)
                </button>
                <button
                  className={`pill-btn ${activeImageSrc.includes('street') ? 'active' : ''}`}
                  onClick={() => setActiveImageSrc('/samples/street_pedestrians.jpg')}
                >
                  Pedestrian Crossing (Real Crowd)
                </button>
                <button
                  className={`pill-btn ${activeImageSrc.includes('mall') ? 'active' : ''}`}
                  onClick={() => setActiveImageSrc('/samples/mall_concourse.jpg')}
                >
                  Mall Atrium (Real Crowd)
                </button>
              </div>
            </>
          ) : (
            /* Offline placeholder for Grad-CAM */
            <div style={{
              height: '320px',
              borderRadius: '8px',
              background: 'rgba(224, 85, 85, 0.06)',
              border: '1px dashed rgba(224, 85, 85, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '24px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔬</div>
              <b style={{ color: '#e05555', fontSize: '15px', display: 'block', marginBottom: '8px' }}>
                AI Service Offline — Grad-CAM Unavailable
              </b>
              <p style={{ color: 'var(--muted)', fontSize: '12.5px', maxWidth: '460px', lineHeight: '1.6' }}>
                Start the AI service (<code>python ai_service/main.py</code>) to compute real PyTorch
                Grad-CAM activations. When online, this panel shows gradient heatmaps computed by
                backpropagating <code>d(TotalCount)/dA_k</code> through CSRNet's dilated backend layers.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 16px', textAlign: 'left', fontSize: '11px' }}>
                  <b style={{ color: '#3478e5', display: 'block', marginBottom: '4px' }}>What Grad-CAM shows:</b>
                  Red regions → model focuses here for counting<br/>
                  Blue regions → low contribution to crowd count<br/>
                  Overlay per conv layer (frontend / backend)
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 16px', textAlign: 'left', fontSize: '11px' }}>
                  <b style={{ color: '#db9225', display: 'block', marginBottom: '4px' }}>Sample crowd photos:</b>
                  /samples/stadium_dense.jpg<br/>
                  /samples/street_pedestrians.jpg<br/>
                  /samples/mall_concourse.jpg
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deep Learning Architecture Highlights */}
        <div className="panel">
          <div className="panel-heading">
            <h2>Architecture Technical Highlights</h2>
          </div>

          <div className="tech-feature-card">
            <h4>1. Dilated Convolutions (Receptive Field Expansion)</h4>
            <p>
              Standard pooling reduces resolution, losing small heads in distant rows.
              CSRNet introduces <b>dilated kernels (r=2)</b> that enlarge the effective receptive field
              from 3×3 to 5×5 without any loss of spatial density details.
            </p>
          </div>

          <div className="tech-feature-card">
            <h4>2. Geometry-Adaptive Gaussian Filtering</h4>
            <p>
              In ShanghaiTech Part A, head size depends on perspective. For each head annotation xᵢ,
              σᵢ = 0.3 × d̄ᵢ, where d̄ᵢ is the average Euclidean distance to its
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

          <div className="tech-feature-card">
            <h4>4. Why Not YOLO for Crowds?</h4>
            <p>
              In ShanghaiTech Part A, average crowd density reaches 501 people per image with up to
              &gt;80% head occlusion. YOLO's NMS suppresses overlapping boxes, drastically
              undercounting. CSRNet's density regression bypasses localization entirely.
            </p>
          </div>

          <div className="tech-feature-card">
            <h4>5. LSTM Crowd Forecasting</h4>
            <p>
              A two-layer LSTM consumes a 10-timestep window of crowd counts to project 15-minute
              ahead forecasts. Trained on venue-specific time-series data with teacher forcing.
              Used for the "Forecast" dashboard panel.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 7: Model Weights Info ── */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Loaded Model Weights &amp; Parameter Summary</h2>
            <p>PyTorch checkpoint details for the deployed CSRNet instance</p>
          </div>
          <span
            className="badge-pill"
            style={{
              background: aiConnected ? 'rgba(25, 167, 121, 0.12)' : 'rgba(224, 85, 85, 0.12)',
              color: aiConnected ? '#19a779' : '#e05555'
            }}
          >
            {aiConnected ? '✓ Weights Loaded' : '⚠ Service Offline'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Weight File', value: 'csrnet_shanghaitech.pth', color: '#3478e5' },
            { label: 'Total Parameters', value: '16.26M', color: '#19a779' },
            { label: 'Frontend (VGG-16)', value: '~14.7M params · ImageNet pretrained', color: '#db9225' },
            { label: 'Backend (Dilated)', value: '~1.56M params · ShanghaiTech trained', color: '#db9225' },
            { label: 'Output Head', value: '1×1 conv · 64 → 1 channel', color: 'var(--muted)' },
            { label: 'Framework', value: 'PyTorch 2.x', color: 'var(--muted)' },
            { label: 'Input Size', value: 'Variable (H × W, rescaled to nearest 8)', color: 'var(--muted)' },
            { label: 'Output Stride', value: '8× (H/8 × W/8 density map)', color: 'var(--muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 14px' }}>
              <small style={{ color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>{label}</small>
              <b style={{ color, fontSize: '13px' }}>{value}</b>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
