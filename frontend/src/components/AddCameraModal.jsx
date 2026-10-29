import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

export default function AddCameraModal() {
  const { showAddCameraModal, setShowAddCameraModal, addCamera, zones, setPage } = useCrowdStore();
  const [streamType, setStreamType] = useState('youtube'); // 'youtube', 'webcam', 'url', 'demo'
  const [formData, setFormData] = useState({
    name: 'Shibuya Crossing Live Feed',
    zoneId: zones[0]?.id || 'zone-arena-01',
    streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA',
    resolution: '1920x1080',
    fps: '2.0',
    sceneType: 'entrance'
  });

  if (!showAddCameraModal) return null;

  const handleSelectType = (type) => {
    setStreamType(type);
    if (type === 'youtube') {
      setFormData(prev => ({
        ...prev,
        name: 'Tokyo Pedestrian Stream (Live)',
        streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA',
        sceneType: 'entrance'
      }));
    } else if (type === 'webcam') {
      setFormData(prev => ({
        ...prev,
        name: 'Laptop Camera Feed (Live Integrated)',
        streamUrl: 'webcam',
        sceneType: 'webcam',
        fps: '15.0'
      }));
    } else if (type === 'url') {
      setFormData(prev => ({
        ...prev,
        name: 'External RTSP Stream 01',
        streamUrl: 'rtsp://edge.venue.lan/live/stream_01',
        sceneType: 'concourse'
      }));
    } else if (type === 'demo') {
      setFormData(prev => ({
        ...prev,
        name: 'Arena Concourse High Density',
        streamUrl: '/samples/mall_concourse.jpg',
        sceneType: 'concourse'
      }));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const targetZone = zones.find((z) => z.id === formData.zoneId) || zones[0];
    await addCamera({
      name: formData.name || (streamType === 'youtube' ? 'YouTube Stream' : 'Live Camera'),
      zone: `${targetZone?.code || 'ZONE-01'}`,
      zoneId: targetZone?.id,
      zoneName: targetZone?.name,
      streamUrl: formData.streamUrl,
      streamType: streamType,
      scene: formData.sceneType || (streamType === 'webcam' ? 'webcam' : streamType === 'youtube' ? 'youtube' : 'concourse'),
      resolution: formData.resolution,
      fps: Number(formData.fps) || 2.0
    });
    setShowAddCameraModal(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Register New Camera Stream</h3>
            <small style={{ color: 'var(--muted)' }}>Supports YouTube live streams, laptop webcams, RTSP feeds & video files</small>
          </div>
          <button className="close-btn" onClick={() => setShowAddCameraModal(false)}>✕</button>
        </div>

        {/* Source Type Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '16px 0' }}>
          {[
            { id: 'youtube', label: 'YouTube Stream', icon: '🌐' },
            { id: 'webcam', label: 'Laptop Camera', icon: '📹' },
            { id: 'url', label: 'RTSP / Video URL', icon: '🔗' },
            { id: 'demo', label: 'Demo Preset', icon: '🖼️' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`button ${streamType === t.id ? 'primary' : 'secondary'}`}
              style={{ padding: '8px 4px', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
              onClick={() => handleSelectType(t.id)}
            >
              <span style={{ fontSize: '16px' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>Camera Placement / Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. West Turnstiles Live Feed"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Stream URL Input based on source type */}
          {streamType === 'youtube' && (
            <div className="form-group">
              <label>YouTube Video or Live Stream URL</label>
              <input
                type="text"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.streamUrl}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
              />
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', alignSelf: 'center' }}>1-Click Presets:</span>
                <button
                  type="button"
                  className="button secondary"
                  style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                  onClick={() => setFormData(prev => ({ ...prev, name: 'Tokyo Shibuya Crossing Live', streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA' }))}
                >
                  Shibuya Crossing
                </button>
                <button
                  type="button"
                  className="button secondary"
                  style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                  onClick={() => setFormData(prev => ({ ...prev, name: 'Times Square Pedestrian Live', streamUrl: 'https://www.youtube.com/watch?v=1b-b4_4oU9M' }))}
                >
                  Times Square
                </button>
                <button
                  type="button"
                  className="button secondary"
                  style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                  onClick={() => setFormData(prev => ({ ...prev, name: 'Venice Beach Boardwalk Live', streamUrl: 'https://www.youtube.com/watch?v=gFRtAAmiFbE' }))}
                >
                  Venice Beach
                </button>
              </div>
            </div>
          )}

          {streamType === 'webcam' && (
            <div className="form-group" style={{ background: 'var(--surface-sunken)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📹</span>
                <div>
                  <strong style={{ fontSize: '13px' }}>Integrated Laptop Camera / Hardware Webcam</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    Captures live video frames directly in the browser and runs continuous CSRNet/YOLO neural crowd estimation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {streamType === 'url' && (
            <div className="form-group">
              <label>RTSP / Network Video Stream URL (.mp4, .m3u8, rtsp://)</label>
              <input
                type="text"
                required
                placeholder="rtsp://192.168.1.100:554/live or https://domain.com/video.mp4"
                value={formData.streamUrl}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
              />
            </div>
          )}

          {streamType === 'demo' && (
            <div className="form-group">
              <label>Scenario Preset Scene</label>
              <select
                value={formData.sceneType}
                onChange={(e) => {
                  const s = e.target.value;
                  const sampleMap = {
                    entrance: '/samples/street_pedestrians.jpg',
                    concourse: '/samples/mall_concourse.jpg',
                    walkway: '/samples/marathon_crowd.jpg',
                    stadium: '/samples/stadium_dense.jpg'
                  };
                  setFormData({ ...formData, sceneType: s, streamUrl: sampleMap[s] || '/samples/mall_concourse.jpg' });
                }}
              >
                <option value="concourse">Arena Main Concourse (Continuous Integrals)</option>
                <option value="stadium">Stadium Congested Bleachers (Heavy Occlusion)</option>
                <option value="walkway">Marathon Pedestrian Ingress</option>
                <option value="entrance">Street Transit Crosswalk</option>
              </select>
            </div>
          )}

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
                <option>1280x720 (720p HD)</option>
                <option>2560x1440 (2K QHD)</option>
                <option>3840x2160 (4K UHD)</option>
              </select>
            </div>

            <div className="form-group">
              <label>AI Sample Rate</label>
              <select
                value={formData.fps}
                onChange={(e) => setFormData({ ...formData, fps: e.target.value })}
              >
                <option value="1.0">1.0 FPS</option>
                <option value="2.0">2.0 FPS (Recommended)</option>
                <option value="5.0">5.0 FPS (Surge)</option>
                <option value="15.0">15.0 FPS (Real-time Live)</option>
              </select>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="button secondary" onClick={() => setShowAddCameraModal(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Initialize Stream &amp; View Live →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
