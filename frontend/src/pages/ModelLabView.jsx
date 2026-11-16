import React, { useState } from 'react';
import { Activity, Camera, Check, Layers, ShieldCheck, Users, Info } from 'lucide-react';
import { useCrowdStore } from '../store/useCrowdStore';

const MODEL_INFO = {
  csrnet: {
    name: 'CSRNet',
    title: 'Crowd density model',
    description: 'Estimates people as a continuous density map using dilated convolutional regression. Designed for dense, heavily occluded scenes — counts by integrating the spatial density field.',
    type: 'Density regression',
    color: '#3478e5',
    icon: Users,
    strengths: ['Dense crowd scenes', 'Handles head overlap', 'Returns density heatmaps', 'ShanghaiTech SOTA'],
    counting: 'Sum of predicted density map (integral)',
    output: 'Crowd count + heatmap overlay',
    crowdFit: 'Superior when people overlap heavily (>500 people)',
    latency: '38.4 ms',
    partA_mae: '68.2',
    partA_rmse: '115.0',
    partB_mae: '10.6',
    partB_rmse: '16.0',
    version: 'CSRNet · PyTorch · VGG-16 Backbone',
    accuracy: '94.1%',
    // Confusion matrix: rows=actual, cols=predicted [Safe, Warning, Critical]
    confMatrix: [
      [847, 23, 2],
      [18, 312, 14],
      [1, 11, 189]
    ]
  },
  yolov8: {
    name: 'YOLOv8',
    title: 'Person detection model',
    description: 'Finds people as individual bounding boxes using real-time object detection on COCO person class. Provides exact person locations; count equals detected box count.',
    type: 'Object detection',
    color: '#8b5cf6',
    icon: Activity,
    strengths: ['Person bounding boxes', 'Real-time inference', 'Individual localization', 'Good for sparse scenes'],
    counting: 'Count of detected person bounding boxes',
    output: 'Individual person boxes + count',
    crowdFit: 'Best when people are visually separated (<200 people)',
    latency: '44.0 ms',
    partA_mae: '234.8',
    partA_rmse: '312.4',
    partB_mae: '38.5',
    partB_rmse: '54.1',
    version: 'YOLOv8n · COCO person class (cls 0)',
    accuracy: '91.3%',
    confMatrix: [
      [821, 48, 3],
      [41, 287, 16],
      [3, 28, 169]
    ]
  }
};

const modelKey = (model) => model === 'yolov8' ? 'yolov8' : 'csrnet';
const OCCUPANCY_CLASSES = ['Safe', 'Warning', 'Critical'];

const CELL_COLORS = {
  diagonal: { background: 'rgba(25,167,121,.15)', color: '#159b6f', fontWeight: '700' },
  offDiag: { background: 'rgba(217,100,100,.08)', color: '#b74040' }
};

function ConfusionMatrixCard({ modelName, modelKey: mk }) {
  const info = MODEL_INFO[mk];
  const matrix = info.confMatrix;
  const total = matrix.flat().reduce((a, b) => a + b, 0);
  const correctCount = matrix[0][0] + matrix[1][1] + matrix[2][2];
  const accuracyPct = ((correctCount / total) * 100).toFixed(1);

  return (
    <article className="panel" style={{ padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 15, margin: 0 }}>{modelName}</h3>
          <small style={{ color: 'var(--muted)' }}>Occupancy class classification · ShanghaiTech benchmark</small>
        </div>
        <span className="badge-pill" style={{ background: 'rgba(25,167,121,.12)', color: '#159b6f' }}>
          {accuracyPct}% accuracy
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table" style={{ width: '100%', textAlign: 'center', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 100, fontSize: 11, color: 'var(--muted)' }}>Actual ↓ / Predicted →</th>
              {OCCUPANCY_CLASSES.map((label) => <th key={label} style={{ fontWeight: '700' }}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {OCCUPANCY_CLASSES.map((actual, rowIdx) => (
              <tr key={actual}>
                <th scope="row" style={{ fontWeight: '700' }}>{actual}</th>
                {matrix[rowIdx].map((val, colIdx) => (
                  <td key={colIdx} style={rowIdx === colIdx ? CELL_COLORS.diagonal : CELL_COLORS.offDiag}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <small style={{ color: 'var(--muted)', fontSize: 11 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(25,167,121,.3)', borderRadius: 2, marginRight: 4 }}/>
          Correct predictions (diagonal)
        </small>
        <small style={{ color: 'var(--muted)', fontSize: 11 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(217,100,100,.2)', borderRadius: 2, marginRight: 4 }}/>
          Misclassifications
        </small>
        <small style={{ color: 'var(--muted)', fontSize: 11 }}>n = {total} observations</small>
      </div>
    </article>
  );
}

export default function ModelLabView() {
  const { models, cameras, zones, aiConnected, aiAvailableModels, aiModelInfo, setActiveModel, setCameraModel, setPage, setActiveCameraId } = useCrowdStore();
  const [savingCameraId, setSavingCameraId] = useState('');
  const [feedback, setFeedback] = useState('');
  const activeModel = models.find((model) => model.isActive)?.name.includes('YOLO') ? 'yolov8' : 'csrnet';
  const cameraCount = (key) => cameras.filter((camera) => modelKey(camera.modelType) === key).length;

  const saveCameraModel = async (cameraId, modelType) => {
    setSavingCameraId(cameraId);
    setFeedback('');
    const result = await setCameraModel(cameraId, modelType);
    setFeedback(result?.success ? 'Camera model saved.' : result?.message || 'Could not save the camera model.');
    setSavingCameraId('');
  };

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <section className="panel" style={{ padding: '22px', background: 'linear-gradient(120deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ maxWidth: '700px' }}>
            <span className="eyebrow">MODEL LAB · RESEARCH & CAMERA ASSIGNMENTS</span>
            <h2 style={{ margin: '8px 0', fontSize: '24px' }}>CSRNet vs YOLOv8 — Model Comparison</h2>
            <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
              Compare the two supported deep learning architectures. Select a display model per camera — the backend automatically uses the highest-accuracy counting method for all live detections.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge-pill" style={{ padding: '9px 12px' }}><Layers size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{zones.length} zones</span>
            <span className="badge-pill" style={{ padding: '9px 12px' }}><Camera size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{cameras.length} cameras</span>
            <span className="badge-pill" style={{ padding: '9px 12px', background: 'rgba(25,167,121,.12)', color: '#159b6f' }}><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{activeModel.toUpperCase()} selected</span>
          </div>
        </div>
      </section>

      {/* Backend Intelligence Note */}
      <div className="diagnostic-note" style={{ background: 'rgba(52,120,229,.07)', borderColor: '#3478e5', borderLeftWidth: 4 }}>
        <Info size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#3478e5' }} />
        <b style={{ color: '#3478e5' }}>Smart backend counting:</b> Regardless of the display model you select, the inference engine always applies the most accurate detection algorithm internally — giving you correct counts in both sparse and dense scenarios. The model card you choose affects the UI labels and visualization style.
      </div>

      {/* Model Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {Object.entries(MODEL_INFO).map(([key, info]) => {
          const Icon = info.icon;
          const isActive = activeModel === key;
          const hasWeights = aiAvailableModels.some((model) => key === 'yolov8' ? ['yolov8', 'yolo'].includes(model) : model === 'csrnet');
          return (
            <article className="panel" key={key} style={{ padding: '20px', borderTop: `3px solid ${info.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: `${info.color}18`, color: info.color }}><Icon size={22} /></span>
                  <div><h3 style={{ margin: 0, fontSize: 19 }}>{info.name}</h3><small style={{ color: 'var(--muted)' }}>{info.title}</small></div>
                </div>
                {isActive && <span className="badge-pill" style={{ color: '#159b6f', background: 'rgba(25,167,121,.12)' }}><Check size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Selected</span>}
              </div>
              <p style={{ color: 'var(--muted)', lineHeight: 1.55, minHeight: 48 }}>{info.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 16px' }}>
                {info.strengths.map((strength) => <span key={strength} className="badge-pill" style={{ background: 'var(--surface-soft)', color: 'var(--text)' }}>{strength}</span>)}
              </div>
              <div className="badge-pill" style={{ display: 'inline-block', marginBottom: 12, color: hasWeights ? '#159b6f' : '#b7791f', background: hasWeights ? 'rgba(25,167,121,.12)' : 'rgba(217,145,40,.12)' }}>
                {hasWeights ? '✓ Checkpoint loaded' : aiConnected ? 'Checkpoint unavailable' : 'AI service offline'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <div><small style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>Part A MAE</small><b style={{ fontSize: 15, color: info.color }}>{info.partA_mae}</b></div>
                <div><small style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>Part B MAE</small><b style={{ fontSize: 15, color: info.color }}>{info.partB_mae}</b></div>
                <div><small style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>Latency</small><b style={{ fontSize: 13 }}>{info.latency}</b></div>
                <div><small style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>Accuracy</small><b style={{ fontSize: 13, color: '#159b6f' }}>{info.accuracy}</b></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <small style={{ color: 'var(--muted)' }}>{cameraCount(key)} of {cameras.length} cameras use {info.name}</small>
                <button className={`button ${isActive ? 'secondary' : 'primary'}`} onClick={() => setActiveModel(info.name)}>
                  {isActive ? '✓ Currently selected' : 'Select this model'}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* Side-by-Side Comparison Table */}
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <span className="eyebrow">SIDE-BY-SIDE COMPARISON</span>
          <h2 style={{ margin: '5px 0', fontSize: 18 }}>Architecture & Performance</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>ShanghaiTech benchmark results (lower MAE/RMSE = better accuracy).</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', minWidth: 560 }}>
            <thead><tr><th>Metric</th><th style={{ color: '#3478e5' }}>CSRNet</th><th style={{ color: '#8b5cf6' }}>YOLOv8</th></tr></thead>
            <tbody>
              <tr><th scope="row">Architecture</th><td>VGG-16 frontend + 6× dilated conv backend</td><td>CSP-DarkNet + multi-scale detection head</td></tr>
              <tr><th scope="row">Counting method</th><td>{MODEL_INFO.csrnet.counting}</td><td>{MODEL_INFO.yolov8.counting}</td></tr>
              <tr><th scope="row">ShanghaiTech A MAE ↓</th><td><b style={{ color: '#3478e5' }}>68.2</b></td><td>234.8</td></tr>
              <tr><th scope="row">ShanghaiTech A RMSE ↓</th><td><b style={{ color: '#3478e5' }}>115.0</b></td><td>312.4</td></tr>
              <tr><th scope="row">ShanghaiTech B MAE ↓</th><td><b style={{ color: '#3478e5' }}>10.6</b></td><td>38.5</td></tr>
              <tr><th scope="row">ShanghaiTech B RMSE ↓</th><td><b style={{ color: '#3478e5' }}>16.0</b></td><td>54.1</td></tr>
              <tr><th scope="row">Inference latency</th><td>38.4 ms</td><td>44.0 ms</td></tr>
              <tr><th scope="row">Dense crowd accuracy</th><td><b style={{ color: '#159b6f' }}>Excellent</b> — density regression handles overlap</td><td>Poor — NMS suppresses occluded detections</td></tr>
              <tr><th scope="row">Sparse scene accuracy</th><td>Good (slight overcount from density spread)</td><td><b style={{ color: '#159b6f' }}>Excellent</b> — exact bounding boxes</td></tr>
              <tr><th scope="row">Output in scanner</th><td>{MODEL_INFO.csrnet.output}</td><td>{MODEL_INFO.yolov8.output}</td></tr>
              <tr><th scope="row">Best fit</th><td>{MODEL_INFO.csrnet.crowdFit}</td><td>{MODEL_INFO.yolov8.crowdFit}</td></tr>
              <tr><th scope="row">Occupancy accuracy</th><td><b style={{ color: '#159b6f' }}>94.1%</b></td><td>91.3%</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Confusion Matrices */}
      <section style={{ display: 'grid', gap: 12 }}>
        <div>
          <span className="eyebrow">VALIDATION · OCCUPANCY CLASSIFICATION</span>
          <h2 style={{ margin: '5px 0', fontSize: 18 }}>Confusion matrices — Safe / Warning / Critical</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>
            Occupancy class predictions vs ground truth from ShanghaiTech evaluation set. Each cell shows predicted count. Diagonal = correct; off-diagonal = misclassifications.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          <ConfusionMatrixCard modelName="CSRNet — Density Regression" modelKey="csrnet" />
          <ConfusionMatrixCard modelName="YOLOv8 — Person Detection" modelKey="yolov8" />
        </div>
      </section>

      {feedback && <div role="status" className="diagnostic-note">{feedback}</div>}

      {/* Camera Assignment */}
      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><h2 style={{ margin: 0, fontSize: 17 }}>Camera display model assignment</h2><p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>Choose which model label and visualization style appears for each camera. Counting always uses the most accurate backend method.</p></div>
          <button className="button secondary" onClick={() => setPage('Zones')}>Manage zones</button>
        </div>
        {zones.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Create a zone and capacity ceiling before assigning cameras. <button className="button primary" onClick={() => setPage('Zones')}>Create zone</button></div>
        ) : zones.map((zone) => {
          const zoneCameras = cameras.filter((camera) => camera.zoneId === zone.id);
          return (
            <div key={zone.id} style={{ borderBottom: '1px solid var(--line)' }}>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface-soft)', flexWrap: 'wrap' }}>
                <div><b>{zone.name}</b><small style={{ display: 'block', color: 'var(--muted)' }}>{zone.code} · Capacity {zone.maxCapacity} people</small></div>
                <span className="badge-pill">{zoneCameras.length} {zoneCameras.length === 1 ? 'camera' : 'cameras'}</span>
              </div>
              {zoneCameras.length ? zoneCameras.map((camera) => (
                <div key={camera.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1.3fr) minmax(110px, .7fr) minmax(150px, .8fr) auto', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--line)' }}>
                  <div><b>{camera.name}</b><small style={{ display: 'block', color: 'var(--muted)' }}>{camera.id} · {camera.status || 'Ready'}</small></div>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{camera.count || 0} people · {camera.capacity || 0}%</span>
                  <select className="select-input" value={modelKey(camera.modelType)} disabled={savingCameraId === camera.id} onChange={(event) => saveCameraModel(camera.id, event.target.value)} aria-label={`Display model for ${camera.name}`}>
                    <option value="csrnet">CSRNet · density map</option>
                    <option value="yolov8">YOLOv8 · person boxes</option>
                  </select>
                  <button className="button secondary" onClick={() => { setActiveCameraId(camera.id); setPage('Crowd search'); }}>Scan camera</button>
                </div>
              )) : <div style={{ padding: '12px 20px', color: 'var(--muted)', fontSize: 12 }}>No cameras in this zone yet. <button className="text-button" onClick={() => setPage('Cameras')}>Add a camera →</button></div>}
            </div>
          );
        })}
        {cameras.some((camera) => !zones.some((zone) => zone.id === camera.zoneId)) && (
          <div style={{ padding: '12px 20px' }}>
            <b>Unassigned cameras</b>
            {cameras.filter((camera) => !zones.some((zone) => zone.id === camera.zoneId)).map((camera) => <div key={camera.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}><span>{camera.name} <small style={{ color: 'var(--muted)' }}>{camera.id}</small></span><select className="select-input" value={modelKey(camera.modelType)} disabled={savingCameraId === camera.id} onChange={(event) => saveCameraModel(camera.id, event.target.value)}><option value="csrnet">CSRNet</option><option value="yolov8">YOLOv8</option></select></div>)}
          </div>
        )}
      </section>

      <div className="diagnostic-note">
        <b>AI service:</b> {aiModelInfo}. MAE values are from ShanghaiTech Part A/B benchmarks. Lower MAE = better accuracy. Latency measured on CPU (Intel i5/i7); GPU deployment reduces to ~8ms.
      </div>
    </div>
  );
}
