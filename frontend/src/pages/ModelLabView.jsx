import React, { useState } from 'react';
import { Activity, Camera, Check, Layers, ShieldCheck, Users } from 'lucide-react';
import { useCrowdStore } from '../store/useCrowdStore';

const MODEL_INFO = {
  csrnet: {
    name: 'CSRNet',
    title: 'Crowd density model',
    description: 'Estimates people as a continuous density map. Designed to keep counting in dense, heavily occluded scenes.',
    type: 'Density regression',
    color: '#3478e5',
    icon: Users,
    strengths: ['Dense crowd scenes', 'Handles head overlap', 'Returns density heatmaps'],
    latency: 'Measure on deployment hardware',
    partA: '68.2',
    partB: '10.6',
    version: 'CSRNet · PyTorch'
  },
  yolov8: {
    name: 'YOLOv8',
    title: 'Person detection model',
    description: 'Finds people as individual boxes. Useful when operators need to see where detections are in a frame.',
    type: 'Object detection',
    color: '#8b5cf6',
    icon: Activity,
    strengths: ['Person boxes', 'Fast visual review', 'Good for less crowded scenes'],
    latency: 'Measure on deployment hardware',
    partA: 'Not evaluated here',
    partB: 'Not evaluated here',
    version: 'YOLOv8 · COCO person class'
  }
};

const modelKey = (model) => model === 'yolov8' ? 'yolov8' : 'csrnet';

export default function ModelLabView() {
  const { models, cameras, zones, setActiveModel, setCameraModel, setPage, setActiveCameraId } = useCrowdStore();
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
            <span className="eyebrow">MODEL LAB · CAMERA ASSIGNMENTS</span>
            <h2 style={{ margin: '8px 0', fontSize: '24px' }}>Choose how each camera counts people</h2>
            <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>Compare the two supported models, choose a default for new cameras, then assign the model each configured camera will use.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge-pill" style={{ padding: '9px 12px' }}><Layers size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{zones.length} zones</span>
            <span className="badge-pill" style={{ padding: '9px 12px' }}><Camera size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{cameras.length} cameras</span>
            <span className="badge-pill" style={{ padding: '9px 12px', background: 'rgba(25,167,121,.12)', color: '#159b6f' }}><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{activeModel.toUpperCase()} default</span>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {Object.entries(MODEL_INFO).map(([key, info]) => {
          const Icon = info.icon;
          const isActive = activeModel === key;
          return (
            <article className="panel" key={key} style={{ padding: '20px', borderTop: `3px solid ${info.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: `${info.color}18`, color: info.color }}><Icon size={22} /></span>
                  <div><h3 style={{ margin: 0, fontSize: 19 }}>{info.name}</h3><small style={{ color: 'var(--muted)' }}>{info.title}</small></div>
                </div>
                {isActive && <span className="badge-pill" style={{ color: '#159b6f', background: 'rgba(25,167,121,.12)' }}><Check size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Default</span>}
              </div>
              <p style={{ color: 'var(--muted)', lineHeight: 1.55, minHeight: 48 }}>{info.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 16px' }}>
                {info.strengths.map((strength) => <span key={strength} className="badge-pill" style={{ background: 'var(--surface-soft)', color: 'var(--text)' }}>{strength}</span>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <div><small style={{ color: 'var(--muted)', display: 'block' }}>Part A MAE (ref.)</small><b>{info.partA}</b></div>
                <div><small style={{ color: 'var(--muted)', display: 'block' }}>Part B MAE (ref.)</small><b>{info.partB}</b></div>
                <div><small style={{ color: 'var(--muted)', display: 'block' }}>Deployment latency</small><b style={{ fontSize: 11 }}>{info.latency}</b></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <small style={{ color: 'var(--muted)' }}>{cameraCount(key)} of {cameras.length} cameras use {info.name}</small>
                <button className={`button ${isActive ? 'secondary' : 'primary'}`} onClick={() => setActiveModel(info.name)}>
                  {isActive ? 'Default for new cameras' : 'Set as new-camera default'}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <div className="diagnostic-note">
        <b>How to read these figures:</b> CSRNet MAE values are published ShanghaiTech reference results, not measurements from the weights currently installed here. YOLOv8 metrics require evaluation on the same labeled test split. Live latency depends on the model weights, image size, and deployment hardware.
      </div>
      {feedback && <div role="status" className="diagnostic-note">{feedback}</div>}

      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><h2 style={{ margin: 0, fontSize: 17 }}>Zones and camera models</h2><p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>See camera totals by zone and change a camera’s model here.</p></div>
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
                  <select className="select-input" value={modelKey(camera.modelType)} disabled={savingCameraId === camera.id} onChange={(event) => saveCameraModel(camera.id, event.target.value)} aria-label={`Model for ${camera.name}`}>
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
    </div>
  );
}
