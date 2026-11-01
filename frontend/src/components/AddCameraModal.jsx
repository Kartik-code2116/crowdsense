import React, { useState } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import VenueSpatialMap from './VenueSpatialMap';
import { Video, MapPin, Compass, Shield, CheckCircle2, Globe, Laptop, Radio } from 'lucide-react';

export default function AddCameraModal() {
  const { showAddCameraModal, setShowAddCameraModal, addCamera, zones } = useCrowdStore();
  const [streamType, setStreamType] = useState('youtube'); // 'youtube', 'webcam', 'url', 'demo'
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'location'

  const [formData, setFormData] = useState({
    name: 'Shibuya Crossing Live Feed',
    zoneId: zones[0]?.id || 'zone-arena-01',
    streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA',
    resolution: '1920x1080',
    fps: '2.0',
    sceneType: 'entrance',
    mapPin: { x: 38, y: 42, bearing: 'South', angle: 0, fov: 75, lat: 35.6595, lng: 139.7004 }
  });

  if (!showAddCameraModal) return null;

  const selectedZone = zones.find((z) => z.id === formData.zoneId) || zones[0];

  const handleSelectType = (type) => {
    setStreamType(type);
    if (type === 'youtube') {
      setFormData((prev) => ({
        ...prev,
        name: 'Tokyo Pedestrian Stream (Live)',
        streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA',
        sceneType: 'entrance'
      }));
    } else if (type === 'webcam') {
      setFormData((prev) => ({
        ...prev,
        name: 'Laptop Camera Feed (Live Integrated)',
        streamUrl: 'webcam',
        sceneType: 'webcam',
        fps: '15.0'
      }));
    } else if (type === 'url') {
      setFormData((prev) => ({
        ...prev,
        name: 'External RTSP Stream 01',
        streamUrl: 'rtsp://edge.venue.lan/live/stream_01',
        sceneType: 'concourse'
      }));
    } else if (type === 'demo') {
      setFormData((prev) => ({
        ...prev,
        name: 'Arena Concourse High Density',
        streamUrl: '/samples/mall_concourse.jpg',
        sceneType: 'concourse'
      }));
    }
  };

  const handleCameraPinChange = (pinData) => {
    setFormData((prev) => ({
      ...prev,
      mapPin: pinData
    }));
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
      fps: Number(formData.fps) || 2.0,
      mapPin: formData.mapPin
    });

    setShowAddCameraModal(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="#38bdf8" />
              Register New Camera &amp; Link to Spatial Zone
            </h3>
            <small style={{ color: 'var(--muted)' }}>
              Supports YouTube Live, laptop webcams, RTSP IP cameras, and real map pin positioning
            </small>
          </div>
          <button className="close-btn" onClick={() => setShowAddCameraModal(false)}>✕</button>
        </div>

        {/* Source Type Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '14px 0' }}>
          {[
            { id: 'youtube', label: 'YouTube Stream', icon: '🔴', desc: 'Live Web Stream' },
            { id: 'webcam', label: 'Laptop Camera', icon: '📹', desc: 'Local WebRTC' },
            { id: 'url', label: 'RTSP / Video URL', icon: '🌐', desc: 'IP Network Feed' },
            { id: 'demo', label: 'Demo Benchmark', icon: '⚡', desc: 'Deep Learning Dataset' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`button ${streamType === t.id ? 'primary' : 'secondary'}`}
              style={{
                padding: '8px 4px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                border: streamType === t.id ? '1px solid #38bdf8' : '1px solid var(--line)'
              }}
              onClick={() => handleSelectType(t.id)}
            >
              <span style={{ fontSize: '18px' }}>{t.icon}</span>
              <strong style={{ fontSize: '11.5px' }}>{t.label}</strong>
              <small style={{ fontSize: '9.5px', color: 'var(--muted)' }}>{t.desc}</small>
            </button>
          ))}
        </div>

        {/* Wizard Step Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '14px' }}>
          <button
            type="button"
            className={`pill-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            1. Stream Configuration
          </button>
          <button
            type="button"
            className={`pill-btn ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
          >
            2. Zone Linking &amp; Spatial Map Pin 📍
          </button>
        </div>

        <form onSubmit={handleAdd}>
          {activeTab === 'config' && (
            <div>
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
                    <span style={{ fontSize: '11px', color: 'var(--muted)', alignSelf: 'center' }}>Presets:</span>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ height: '24px', fontSize: '10.5px', padding: '0 8px' }}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          name: 'Tokyo Shibuya Crossing Live',
                          streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA'
                        }))
                      }
                    >
                      Shibuya Crossing
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ height: '24px', fontSize: '10.5px', padding: '0 8px' }}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          name: 'Times Square Pedestrian Live',
                          streamUrl: 'https://www.youtube.com/watch?v=1b-b4_4oU9M'
                        }))
                      }
                    >
                      Times Square
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ height: '24px', fontSize: '10.5px', padding: '0 8px' }}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          name: 'Venice Beach Boardwalk Live',
                          streamUrl: 'https://www.youtube.com/watch?v=gFRtAAmiFbE'
                        }))
                      }
                    >
                      Venice Beach
                    </button>
                  </div>
                </div>
              )}

              {streamType === 'webcam' && (
                <div
                  className="form-group"
                  style={{
                    background: 'var(--surface-soft)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 255, 204, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📹</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#00ffcc' }}>
                        Integrated Laptop Camera / Hardware Webcam
                      </strong>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        Direct browser WebRTC stream with hardware head detection and live OSD status telemetry.
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
                      setFormData({
                        ...formData,
                        sceneType: s,
                        streamUrl: sampleMap[s] || '/samples/mall_concourse.jpg'
                      });
                    }}
                  >
                    <option value="concourse">Arena Main Concourse (Continuous Integrals)</option>
                    <option value="stadium">Stadium Congested Bleachers (Heavy Occlusion)</option>
                    <option value="walkway">Marathon Pedestrian Ingress</option>
                    <option value="entrance">Street Transit Crosswalk</option>
                  </select>
                </div>
              )}

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
                    <option value="2.0">2.0 FPS (Standard)</option>
                    <option value="5.0">5.0 FPS (High Surge)</option>
                    <option value="15.0">15.0 FPS (Real-time Live)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button
                  type="button"
                  className="button primary"
                  style={{ fontSize: '12px' }}
                  onClick={() => setActiveTab('location')}
                >
                  Next: Link to Zone &amp; Place on Map →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Safety Zone Assignment (Parent Hierarchy)</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                    Ceiling: {selectedZone?.maxCapacity || 350} people
                  </span>
                </label>
                <select
                  value={formData.zoneId}
                  onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                  style={{ fontWeight: '600' }}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.code}) — {z.floor || 'Level 1'} [Ceiling: {z.maxCapacity} people]
                    </option>
                  ))}
                </select>
              </div>

              {/* Real Interactive Map Placement Interface */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: '700' }}>
                    📍 Real Physical Camera Location on Venue Map
                  </label>
                  <span style={{ fontSize: '11px', color: '#00ffcc', fontWeight: '700' }}>
                    Grid: ({formData.mapPin.x}%, {formData.mapPin.y}%) • Facing {formData.mapPin.bearing || 'South'}
                  </span>
                </div>

                <VenueSpatialMap
                  mode="pick-camera"
                  zones={zones}
                  cameras={[]}
                  activeZoneId={formData.zoneId}
                  initialPin={formData.mapPin}
                  onPinChange={handleCameraPinChange}
                  height={240}
                  showControls={true}
                />

                <small style={{ display: 'block', color: 'var(--muted)', marginTop: '6px', fontSize: '11px' }}>
                  💡 <b>Click anywhere on the map</b> to drop the camera pin. Use the direction buttons below the map to orient the lens angle.
                </small>
              </div>

              <div
                style={{
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <small style={{ color: 'var(--muted)', display: 'block' }}>LINKED SPATIAL SCOPE</small>
                  <b style={{ color: 'var(--text)', fontSize: '13px' }}>{selectedZone?.name}</b>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ color: 'var(--muted)', display: 'block' }}>SECURITY CEILING</small>
                  <b style={{ color: '#22c55e', fontSize: '13px' }}>
                    {selectedZone?.maxCapacity || 350} max occupants
                  </b>
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="button secondary" onClick={() => setShowAddCameraModal(false)}>
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeTab === 'location' && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setActiveTab('config')}
                >
                  ← Back to Config
                </button>
              )}
              <button type="submit" className="button primary">
                ✓ Save Camera &amp; Launch Feed →
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
