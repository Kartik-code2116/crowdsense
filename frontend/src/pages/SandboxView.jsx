import React, { useEffect, useState } from 'react';
import { Activity, ImagePlus, RotateCw, Upload } from 'lucide-react';
import { apiClient } from '../api/client';

const samples = [
  { id: 'stadium', name: 'Stadium', src: '/samples/stadium_dense.jpg' },
  { id: 'concourse', name: 'Concourse', src: '/samples/mall_concourse.jpg' },
  { id: 'street', name: 'Street', src: '/samples/street_pedestrians.jpg' },
  { id: 'marathon', name: 'Marathon', src: '/samples/marathon_crowd.jpg' }
];

export default function SandboxView() {
  const [source, setSource] = useState({ src: samples[0].src, name: samples[0].name });
  const [model, setModel] = useState('csrnet');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(true);

  const runInference = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(source.src);
      if (!response.ok) throw new Error('Could not read this image. Choose another sample or upload a photo.');
      const data = await apiClient.predictImage(await response.blob(), model, 0);
      if (!data || data.status === 'error' || data.success === false) {
        throw new Error(data?.message || data?.detail || 'The AI service did not return a result. Check that the selected model weights are installed and the service is running.');
      }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Inference could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { runInference(); }, [source.src, model]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, or other image file.');
      return;
    }
    const src = URL.createObjectURL(file);
    setSource({ src, name: file.name });
  };

  useEffect(() => () => {
    if (source.src.startsWith('blob:')) URL.revokeObjectURL(source.src);
  }, [source.src]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="panel" style={{ padding: 22, background: 'linear-gradient(120deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))' }}>
        <span className="eyebrow">MODEL PLAYGROUND · ONE IMAGE</span>
        <h2 style={{ margin: '8px 0' }}>Try a crowd model</h2>
        <p style={{ maxWidth: 760, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Run the configured CSRNet or YOLOv8 checkpoint on an image. Results below come from that inference request;
          the bundled photos are examples and are not venue measurements.
        </p>
      </section>

      <section className="panel" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div><h3 style={{ margin: 0 }}>Choose an image</h3><small style={{ color: 'var(--muted)' }}>Sample photos or upload a JPG / PNG</small></div>
          <label className="button secondary" style={{ cursor: 'pointer' }}><Upload size={15} /> Upload image<input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {samples.map((sample) => <button key={sample.id} className={`button ${source.src === sample.src ? 'primary' : 'secondary'}`} onClick={() => setSource({ src: sample.src, name: sample.name })}><ImagePlus size={14} /> {sample.name}</button>)}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, .8fr)', gap: 16 }}>
        <article className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div><b>{source.name}</b><small style={{ display: 'block', color: 'var(--muted)' }}>Input image</small></div>
            <button className="button secondary" disabled={busy} onClick={runInference}><RotateCw size={14} /> {busy ? 'Running…' : 'Run again'}</button>
          </div>
          <div style={{ position: 'relative', minHeight: 260, height: 'min(58vh, 520px)', background: '#0b1220', borderRadius: 12, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            <img src={source.src} alt={`Input image: ${source.name}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            {showHeatmap && result?.heatmap_data_url && <img src={result.heatmap_data_url} alt="Density visualization returned by the selected model" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: .68, pointerEvents: 'none' }} />}
            {busy && <span className="badge-pill" style={{ position: 'absolute', top: 12, left: 12 }}>Inference running…</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button className={`button ${showHeatmap ? 'primary' : 'secondary'}`} onClick={() => setShowHeatmap((value) => !value)} disabled={!result?.heatmap_data_url}>Density visualization {showHeatmap ? 'on' : 'off'}</button>
            <label className="select-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Model
              <select value={model} onChange={(event) => setModel(event.target.value)} style={{ background: 'transparent', color: 'inherit', border: 0 }}><option value="csrnet">CSRNet</option><option value="yolov8">YOLOv8</option></select>
            </label>
          </div>
        </article>

        <article className="panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Activity size={18} color="var(--accent)" /><h3 style={{ margin: 0 }}>Inference result</h3></div>
          {error ? <div role="alert" className="diagnostic-note" style={{ marginTop: 16 }}><b>Could not run inference</b><p>{error}</p></div> : !result ? <p style={{ color: 'var(--muted)', marginTop: 18 }}>Waiting for a model response…</p> : (
            <div style={{ display: 'grid', gap: 13, marginTop: 18 }}>
              <Metric label="Selected model" value={String(result.model || model).toUpperCase()} />
              <Metric label="Estimated people" value={Number.isFinite(Number(result.count)) ? Math.round(Number(result.count)).toLocaleString() : '—'} prominent />
              <Metric label="Inference time" value={Number.isFinite(Number(result.latency_ms)) ? `${result.latency_ms} ms` : 'Not reported'} />
              <Metric label="Detected boxes" value={Array.isArray(result.detected_boxes) ? result.detected_boxes.length.toLocaleString() : 'Not returned'} />
              <Metric label="Peak density map value" value={Number.isFinite(Number(result.peak_density)) ? result.peak_density : 'Not returned'} />
              <small style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Results depend on the checkpoint installed in the AI service, image quality, and deployment hardware. This image scan does not create a live camera history record.</small>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function Metric({ label, value, prominent = false }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 9, gap: 12 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span><b style={{ fontSize: prominent ? 24 : 14, color: prominent ? 'var(--accent)' : 'var(--text)' }}>{value}</b></div>;
}
