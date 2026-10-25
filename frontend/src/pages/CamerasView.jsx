import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function CamerasView() {
  const { cameras, addCamera, deleteCamera, zones } = useCrowdStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    zoneId: 'z1',
    streamUrl: 'rtsp://edge.venue.lan/cam_feed',
    resolution: '1920x1080',
    fps: 2.0
  });

  const handleAdd = (e) => {
    e.preventDefault();
    const targetZone = zones.find((z) => z.id === formData.zoneId) || zones[0];
    addCamera({
      name: formData.name || 'New Camera Stream',
      zone: `${targetZone.code}`,
      zoneId: targetZone.id,
      resolution: formData.resolution,
      fps: Number(formData.fps)
    });
    setShowModal(false);
    setFormData({ name: '', zoneId: 'z1', streamUrl: 'rtsp://edge.venue.lan/cam_feed', resolution: '1920x1080', fps: 2.0 });
  };

  return (
    <div className="cameras-view-container">
      <div className="page-action-row">
        <div>
          <h2>Connected Venue Edge Cameras ({cameras.length})</h2>
          <p>RTSP streams sampled at 1-2 FPS and regressed via Python FastAPI microservice</p>
        </div>
        <button className="button primary" onClick={() => setShowModal(true)}>
          + Register New Camera
        </button>
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>CAMERA NAME</th>
              <th>ASSIGNED ZONE</th>
              <th>STREAM / RTSP</th>
              <th>RESOLUTION</th>
              <th>SAMPLE RATE</th>
              <th>AI LATENCY</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((cam) => (
              <tr key={cam.id}>
                <td>
                  <b>{cam.name}</b>
                  <small style={{ display: 'block', color: 'var(--muted)' }}>{cam.id}</small>
                </td>
                <td>{cam.zone}</td>
                <td><code style={{ fontSize: '10px' }}>rtsp://edge.venue.lan/{cam.id}</code></td>
                <td>{cam.resolution}</td>
                <td>{cam.fps} FPS</td>
                <td><b>{cam.latencyMs} ms</b></td>
                <td>
                  <span className="live-pill" style={{ display: 'inline-flex' }}>
                    <i /> {cam.status}
                  </span>
                </td>
                <td>
                  <button
                    className="button secondary"
                    style={{ height: '24px', fontSize: '9px', padding: '0 8px' }}
                    onClick={() => deleteCamera(cam.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for adding camera */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Camera Stream</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Camera Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Turnstiles Gate C"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>RTSP / Video Feed URL</label>
                <input
                  type="text"
                  required
                  value={formData.streamUrl}
                  onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Safety Zone Assignment</label>
                <select
                  value={formData.zoneId}
                  onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Resolution</label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  >
                    <option>1920x1080 (1080p FHD)</option>
                    <option>2560x1440 (2K QHD)</option>
                    <option>3840x2160 (4K UHD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sample FPS (to AI)</label>
                  <select
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: e.target.value })}
                  >
                    <option value="1.0">1.0 FPS (Standard)</option>
                    <option value="2.0">2.0 FPS (Recommended)</option>
                    <option value="5.0">5.0 FPS (High Density)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary">
                  Initialize Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
