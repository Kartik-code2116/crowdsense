import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AddCameraModal() {
  const { showAddCameraModal, setShowAddCameraModal, addCamera, zones } = useCrowdStore();
  const [formData, setFormData] = useState({
    name: '',
    zoneId: zones[0]?.id || 'zone-demo-01',
    streamUrl: 'rtsp://edge.venue.lan/cam_feed',
    resolution: '1920x1080',
    fps: '2.0'
  });

  if (!showAddCameraModal) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    const targetZone = zones.find((z) => z.id === formData.zoneId) || zones[0];
    addCamera({
      name: formData.name || 'West Turnstiles Gate C',
      zone: `${targetZone.code}`,
      zoneId: targetZone.id,
      resolution: formData.resolution,
      fps: Number(formData.fps)
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Register New Edge Camera Stream</h3>
          <button className="close-btn" onClick={() => setShowAddCameraModal(false)}>✕</button>
        </div>
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>Camera Name / Placement</label>
            <input
              type="text"
              required
              placeholder="e.g. West Turnstiles Gate C"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>RTSP / Video Stream URL</label>
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
              <label>Sample Rate (to AI)</label>
              <select
                value={formData.fps}
                onChange={(e) => setFormData({ ...formData, fps: e.target.value })}
              >
                <option value="1.0">1.0 FPS</option>
                <option value="2.0">2.0 FPS (Recommended)</option>
                <option value="5.0">5.0 FPS (High Surge)</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={() => setShowAddCameraModal(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Initialize Stream & Ingestion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
