import React, { useMemo, useState } from 'react';
import { AlertTriangle, Camera, Edit3, Layers3, Map, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useCrowdStore } from '../store/useCrowdStore';
import VenueSpatialMap from '../components/VenueSpatialMap';

const emptyZone = (index = 1) => ({
  name: '', code: `ZONE-${String(index).padStart(2, '0')}`, floor: '',
  maxCapacity: 300, warningPct: 70, criticalPct: 85, egressCount: 2,
  description: '',
  mapLocation: { lat: 19.076, lng: 72.8777, areaSqM: 300, boundary: [{ x: 18, y: 22 }, { x: 62, y: 22 }, { x: 62, y: 65 }, { x: 18, y: 65 }] }
});

export default function ZonesView() {
  const { zones, cameras, addZone, updateZone, deleteZone, setCameraZone, setActiveCameraId, setPage } = useCrowdStore();
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyZone(zones.length + 1));
  const [cameraAssignments, setCameraAssignments] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const zoneCameras = useMemo(() => zones.map((zone) => ({ zone, cameras: cameras.filter((camera) => camera.zoneId === zone.id) })), [zones, cameras]);
  const totalCapacity = zones.reduce((sum, zone) => sum + Number(zone.maxCapacity || 0), 0);
  const people = zones.reduce((sum, zone) => sum + Number(zone.currentCount || 0), 0);
  const openForm = (zone = null) => {
    setEditing(zone || 'new');
    setForm(zone ? { ...emptyZone(), ...zone, mapLocation: zone.mapLocation || emptyZone().mapLocation } : emptyZone(zones.length + 1));
    setCameraAssignments(Object.fromEntries(cameras.map((camera) => [camera.id, camera.zoneId || ''])));
  };
  const saveZone = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        ...form,
        maxCapacity: Number(form.maxCapacity), warningPct: Number(form.warningPct),
        criticalPct: Number(form.criticalPct), egressCount: Number(form.egressCount)
      };
      if (editing !== 'new') {
        const updated = await updateZone(editing.id, payload);
        if (!updated?.success) { setSaveError(updated?.message || 'Could not save this zone.'); return; }
        for (const camera of cameras) {
          const nextZoneId = cameraAssignments[camera.id];
          if (nextZoneId && nextZoneId !== camera.zoneId) {
            const assigned = await setCameraZone(camera.id, nextZoneId);
            if (!assigned?.success) { setSaveError(assigned?.message || `Could not update ${camera.name}'s zone.`); return; }
          }
        }
      } else {
        const created = await addZone(payload);
        if (!created?.success) { setSaveError(created?.message || 'Could not create this zone.'); return; }
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };
  const removeZone = async (zone) => {
    const count = cameras.filter((camera) => camera.zoneId === zone.id).length;
    if (count) {
      window.alert(`Move the ${count} camera${count === 1 ? '' : 's'} to another zone before deleting this zone.`);
      return;
    }
    if (window.confirm(`Delete ${zone.name}? This cannot be undone.`)) {
      const result = await deleteZone(zone.id);
      setActionMessage(result?.success ? `${zone.name} deleted.` : result?.message || 'Could not delete this zone.');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="panel" style={{ padding: 22, background: 'linear-gradient(120deg, rgba(52,120,229,.11), var(--surface))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow">VENUE SETUP · SAFETY LIMITS</span>
            <h2 style={{ margin: '7px 0', fontSize: 24 }}>Zones &amp; Capacity</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Set a safe people limit for each area, then connect its cameras.</p>
          </div>
          <button className="button primary" onClick={() => openForm()}><Plus size={16} /> Add zone</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 18 }}>
          <Summary icon={Layers3} label="Zones" value={zones.length} />
          <Summary icon={Camera} label="Cameras" value={cameras.length} />
          <Summary icon={Users} label="People detected" value={people.toLocaleString()} />
          <Summary icon={ShieldCheck} label="Combined capacity" value={`${totalCapacity.toLocaleString()} people`} />
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className={`layout-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Zone list</button>
        <button className={`layout-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}><Map size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Venue map</button>
      </div>
      {actionMessage && <div role="status" className="diagnostic-note">{actionMessage}</div>}

      {view === 'map' ? (
        <section className="panel" style={{ padding: 16 }}>
          {zones.length ? <VenueSpatialMap mode="view" zones={zones} cameras={cameras} height={460} showControls onSelectCamera={(camera) => { setActiveCameraId(camera.id); setPage('Live monitor'); }} /> : <EmptyState onAdd={() => openForm()} />}
        </section>
      ) : zones.length === 0 ? <EmptyState onAdd={() => openForm()} /> : (
        <div style={{ display: 'grid', gap: 14 }}>
          {zoneCameras.map(({ zone, cameras: attached }) => {
            const count = Number(zone.currentCount || 0);
            const capacity = Math.max(1, Number(zone.maxCapacity || 1));
            const percent = Math.min(100, Math.round((count / capacity) * 100));
            const level = percent >= Number(zone.criticalPct || 85) ? 'critical' : percent >= Number(zone.warningPct || 70) ? 'warning' : 'safe';
            const color = level === 'critical' ? '#dc4455' : level === 'warning' ? '#d99023' : '#159b6f';
            return (
              <article className="panel" key={zone.id} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span className="badge-pill">{zone.code}</span>{zone.floor && <small style={{ color: 'var(--muted)' }}>{zone.floor}</small>}</div>
                    <h3 style={{ margin: '7px 0 0', fontSize: 18 }}>{zone.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="button secondary" onClick={() => openForm(zone)} title="Edit zone"><Edit3 size={14} /> Edit</button>
                    <button className="button secondary" onClick={() => removeZone(zone)} title={attached.length ? 'Move cameras before deleting this zone' : 'Delete zone'} style={{ color: attached.length ? 'var(--muted)' : '#dc4455' }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ padding: '0 18px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 10 }}>
                    <div><small style={{ color: 'var(--muted)' }}>Current occupancy</small><div style={{ fontSize: 22, fontWeight: 750, color }}>{count.toLocaleString()} <small style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>of {capacity.toLocaleString()} people</small></div></div>
                    <span style={{ fontWeight: 700, color }}>{percent}% · {level === 'safe' ? 'Within limit' : level === 'warning' ? 'Warning' : 'Critical'}</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 99, background: 'var(--surface-soft)', overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: `${percent}%`, background: color, borderRadius: 99, transition: 'width .25s' }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 8, marginTop: 12 }}>
                    <MiniStat label="Warning at" value={`${zone.warningPct || 70}%`} />
                    <MiniStat label="Critical at" value={`${zone.criticalPct || 85}%`} />
                    <MiniStat label="Cameras" value={`${attached.length}`} />
                    <MiniStat label="Exit routes" value={`${zone.egressCount || 0}`} />
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', padding: '12px 18px', background: 'var(--surface-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: attached.length ? 8 : 0 }}>
                    <b style={{ fontSize: 13 }}>Cameras in this zone</b>
                    <button className="text-button" onClick={() => setPage('Cameras')}>{attached.length ? 'Manage cameras →' : 'Add a camera →'}</button>
                  </div>
                  {attached.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {attached.map((camera) => <div key={camera.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '9px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)' }}>
                      <div style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{camera.name}</b><small style={{ color: 'var(--muted)' }}>{camera.count || 0} people · {camera.modelType?.toUpperCase() || 'CSRNET'}</small></div>
                      <button className="button secondary" style={{ padding: '5px 8px', height: 30 }} onClick={() => { setActiveCameraId(camera.id); setPage('Live monitor'); }}>View</button>
                    </div>)}
                  </div> : <small style={{ color: 'var(--muted)' }}>No cameras connected yet.</small>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing !== null && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(null); }}>
          <form className="modal-content" onSubmit={saveZone} style={{ maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header"><div><h3 style={{ margin: 0 }}>{editing !== 'new' ? 'Edit zone' : 'Add a zone'}</h3><small style={{ color: 'var(--muted)' }}>Choose its capacity and alert thresholds.</small></div><button type="button" className="close-btn" onClick={() => setEditing(null)}>×</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <Field label="Zone name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="North entrance" /></Field>
              <Field label="Zone code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
              <Field label="Floor / level"><input value={form.floor || ''} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="Ground floor" /></Field>
              <Field label="People capacity"><input type="number" required min="1" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} /></Field>
              <Field label="Warning threshold (%)"><input type="number" required min="1" max="99" value={form.warningPct} onChange={(e) => setForm({ ...form, warningPct: e.target.value })} /></Field>
              <Field label="Critical threshold (%)"><input type="number" required min="1" max="100" value={form.criticalPct} onChange={(e) => setForm({ ...form, criticalPct: e.target.value })} /></Field>
              <Field label="Exit routes"><input type="number" min="0" value={form.egressCount} onChange={(e) => setForm({ ...form, egressCount: e.target.value })} /></Field>
            </div>
            {editing !== 'new' && <div style={{ marginTop: 14, border: '1px solid var(--line)', borderRadius: 9, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}><Camera size={15} color="#3478e5" /><b style={{ fontSize: 13 }}>Camera assignments</b></div>
              <small style={{ color: 'var(--muted)', display: 'block', marginBottom: 10 }}>Choose which zone each camera belongs to. Changes are saved with this zone.</small>
              {cameras.length ? <div style={{ display: 'grid', gap: 8, maxHeight: 190, overflowY: 'auto' }}>
                {cameras.map((camera) => <div key={camera.id} style={{ display: 'grid', gridTemplateColumns: '1fr minmax(150px, 1fr)', alignItems: 'center', gap: 10 }}>
                  <span style={{ minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b>{camera.name}</b><small style={{ color: 'var(--muted)', marginLeft: 6 }}>{camera.id}</small></span>
                  <select className="select-input" value={cameraAssignments[camera.id] || camera.zoneId || ''} onChange={(event) => setCameraAssignments({ ...cameraAssignments, [camera.id]: event.target.value })} aria-label={`Zone for ${camera.name}`}>
                    {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                  </select>
                </div>)}
              </div> : <small style={{ color: 'var(--muted)' }}>No cameras are registered yet. Add cameras from the Cameras page.</small>}
            </div>}
            {saveError && <div role="alert" style={{ color: '#dc4455', fontSize: 12, marginTop: 10 }}>{saveError}</div>}
            {Number(form.warningPct) >= Number(form.criticalPct) && <div style={{ color: '#dc4455', fontSize: 12, marginTop: 10 }}><AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Critical threshold must be above warning.</div>}
            <div className="modal-actions" style={{ marginTop: 18 }}><button type="button" className="button secondary" disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button className="button primary" type="submit" disabled={saving || Number(form.warningPct) >= Number(form.criticalPct)}>{saving ? 'Saving…' : editing !== 'new' ? 'Save changes' : 'Create zone'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Summary({ icon: Icon, label, value }) {
  return <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', background: 'var(--surface)' }}><div style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--muted)', fontSize: 11 }}><Icon size={14} />{label}</div><b style={{ display: 'block', fontSize: 18, marginTop: 4 }}>{value}</b></div>;
}

function MiniStat({ label, value }) {
  return <div style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 7, padding: '7px 9px' }}><small style={{ display: 'block', color: 'var(--muted)' }}>{label}</small><b style={{ fontSize: 12 }}>{value}</b></div>;
}

function Field({ label, children }) {
  return <div className="form-group" style={{ margin: 0 }}><label>{label}</label>{children}</div>;
}

function EmptyState({ onAdd }) {
  return <section className="panel" style={{ padding: 32, textAlign: 'center' }}><Layers3 size={28} color="#3478e5" /><h3>No zones yet</h3><p style={{ color: 'var(--muted)' }}>Create your first zone and set the maximum safe number of people.</p><button className="button primary" onClick={onAdd}><Plus size={15} /> Add zone</button></section>;
}
