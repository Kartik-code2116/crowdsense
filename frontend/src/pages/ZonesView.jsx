import React, { useState, useEffect, useRef } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import { apiClient } from '../api/client';
import { webcamManager } from '../services/webcamManager';
import VenueSpatialMap from '../components/VenueSpatialMap';
import {
  Layers,
  MapPin,
  Video,
  Shield,
  AlertTriangle,
  Radio,
  Plus,
  Compass,
  Maximize2,
  Trash2,
  Edit2,
  Activity,
  CheckCircle2
} from 'lucide-react';

/**
 * Intelligent Stream URL Parser
 * Detects YouTube, Twitch, RTSP, HLS, MP4, Webcam, or Demo sample feeds
 */
export function parseStreamMeta(url) {
  if (!url) return { type: 'none', label: 'Not Configured', videoId: null };
  const str = url.trim();

  // 1. Local Webcam
  if (str.toLowerCase() === 'webcam' || str.toLowerCase() === 'camera' || str.toLowerCase() === 'device:0') {
    return { type: 'webcam', label: 'Integrated Webcam', badge: '📹 WEBCAM', videoId: null };
  }

  // 2. YouTube (watch, live, shorts, youtu.be, embed)
  const ytMatch = str.match(/(?:v=|\/live\/|\/embed\/|youtu\.be\/|\/shorts\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return {
      type: 'youtube',
      label: 'YouTube Stream',
      badge: '▶ YOUTUBE',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playsinline=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
    };
  }

  // 3. Twitch
  if (str.includes('twitch.tv')) {
    const channelMatch = str.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    const channel = channelMatch ? channelMatch[1] : '';
    return {
      type: 'twitch',
      label: 'Twitch Live Stream',
      badge: '🟣 TWITCH',
      channel,
      embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname || 'localhost'}&muted=true`
    };
  }

  // 4. RTSP Stream
  if (str.startsWith('rtsp://')) {
    return { type: 'rtsp', label: 'RTSP IP Camera', badge: '🌐 RTSP', videoId: null };
  }

  // 5. HLS Stream (.m3u8)
  if (str.includes('.m3u8')) {
    return { type: 'hls', label: 'HLS Live Stream', badge: '📡 HLS/M3U8', videoId: null };
  }

  // 6. Direct MP4 / WebM
  if (str.endsWith('.mp4') || str.endsWith('.webm') || str.includes('.mp4?') || str.includes('.webm?')) {
    return { type: 'video', label: 'Direct Video Stream', badge: '🎥 MP4 STREAM', videoId: null };
  }

  // 7. Benchmark / Demo Sample Feeds
  if (str.includes('/samples/') || str.endsWith('.jpg') || str.endsWith('.png')) {
    return { type: 'demo', label: 'Sample Benchmark Feed', badge: '⚡ DEMO FEED', videoId: null };
  }

  return { type: 'url', label: 'Custom Web Stream', badge: '🔗 STREAM', videoId: null };
}

export default function ZonesView() {
  const {
    zones,
    cameras,
    addZone,
    deleteZone,
    updateZone,
    updateZoneThresholds,
    recordRealDetection,
    inspectInCrowdSearch,
    setShowAddCameraModal,
    setActiveCameraId,
    setPage
  } = useCrowdStore();

  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'map'
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState('details'); // 'details' | 'map'
  const [editingStreamZoneId, setEditingStreamZoneId] = useState(null);
  const [newStreamUrl, setNewStreamUrl] = useState('');

  // Active Zone Scanner Modal State
  const [activeScanningZone, setActiveScanningZone] = useState(null);
  const [scannerViewMode, setScannerViewMode] = useState('split'); // 'split' | 'vision' | 'player'
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [scanModel, setScanModel] = useState('yolov8');
  const [scannerTelemetry, setScannerTelemetry] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState(null);

  // Scanner Video & Canvas references
  const videoRef = useRef(null);
  const streamTrackRef = useRef(null);
  const liveIntervalRef = useRef(null);

  // Form Data for Adding a New Zone with Real Spatial Area
  const [newZoneForm, setNewZoneForm] = useState({
    name: 'East Spectator Plaza',
    code: `ZONE-0${zones.length + 1}`,
    floor: 'Level 1 Concourse',
    maxCapacity: 300,
    warningPct: 70,
    criticalPct: 85,
    egressCount: 3,
    streamUrl: '/samples/mall_concourse.jpg',
    description: 'Designated outdoor spectator area with continuous dilated CSRNet density estimation.',
    mapLocation: {
      lat: 35.6598,
      lng: 139.7008,
      areaSqM: 380,
      boundary: [
        { x: 20, y: 30 },
        { x: 70, y: 30 },
        { x: 70, y: 70 },
        { x: 20, y: 70 }
      ]
    }
  });

  const streamPresets = [
    { label: '▶ YouTube Live Stream / Video', url: 'https://www.youtube.com/watch?v=1-iS7LArMPA' },
    { label: '💻 Integrated Webcam / USB Camera', url: 'webcam' },
    { label: '🏢 Arena Concourse Ingress Feed', url: '/samples/mall_concourse.jpg' },
    { label: '🚶 Urban Pedestrian Crossing', url: '/samples/street_pedestrians.jpg' },
    { label: '🏟️ Dense Stadium Bleachers Feed', url: '/samples/stadium_dense.jpg' },
    { label: '🏃 Marathon Chokepoint Egress', url: '/samples/marathon_crowd.jpg' },
    { label: '🌐 Custom RTSP / HLS / MP4 Stream', url: 'rtsp://edge.venue.lan/live/cam1' }
  ];

  const handleBoundaryChange = (boundaryData) => {
    setNewZoneForm((prev) => ({
      ...prev,
      mapLocation: {
        ...prev.mapLocation,
        boundary: boundaryData.boundary,
        areaSqM: boundaryData.areaSqM,
        lat: boundaryData.lat,
        lng: boundaryData.lng
      }
    }));
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    await addZone({
      name: newZoneForm.name,
      code: newZoneForm.code || `ZONE-0${zones.length + 1}`,
      floor: newZoneForm.floor,
      maxCapacity: Number(newZoneForm.maxCapacity) || 200,
      warningPct: Number(newZoneForm.warningPct) || 70,
      criticalPct: Number(newZoneForm.criticalPct) || 85,
      egressCount: Number(newZoneForm.egressCount) || 2,
      streamUrl: newZoneForm.streamUrl || '/samples/mall_concourse.jpg',
      streamType: parseStreamMeta(newZoneForm.streamUrl).type,
      description: newZoneForm.description,
      mapLocation: newZoneForm.mapLocation
    });

    setShowAddModal(false);
    setModalStep('details');
  };

  const handleDeleteZone = async (zone) => {
    if (window.confirm(`Are you sure you want to remove zone "${zone.name}"?`)) {
      await deleteZone(zone.id);
    }
  };

  const stopLiveScanner = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (streamTrackRef.current) {
      streamTrackRef.current = null;
    }
    setIsLiveScanning(false);
  };

  const closeScannerModal = () => {
    stopLiveScanner();
    setActiveScanningZone(null);
    setScannerTelemetry(null);
    setScannerError(null);
  };

  const handleOpenScanner = async (zone) => {
    setActiveScanningZone(zone);
    setScannerTelemetry(null);
    setScannerError(null);
    setIsLiveScanning(false);

    const meta = parseStreamMeta(zone.streamUrl);
    setScannerViewMode(meta.type === 'youtube' || meta.type === 'twitch' ? 'split' : 'vision');

    if (meta.type === 'webcam') {
      try {
        if (videoRef.current) {
          const stream = await webcamManager.attachToVideo(videoRef.current);
          streamTrackRef.current = stream;
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !err.message?.includes('interrupted')) {
          setScannerError(`Camera access error: ${err.message}. Please check browser camera permissions.`);
        }
      }
    }
  };

  const executeScanTick = async () => {
    if (!activeScanningZone) return;
    setScannerLoading(true);
    setScannerError(null);

    try {
      const meta = parseStreamMeta(activeScanningZone.streamUrl);
      const isWebcam = meta.type === 'webcam';
      const isHtmlVideo = videoRef.current && (isWebcam || meta.type === 'video');

      let result = null;
      let frameImageSrc = activeScanningZone.streamUrl;

      if (isHtmlVideo && videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
        frameImageSrc = canvas.toDataURL('image/jpeg', 0.9);
        result = await apiClient.predictImage(blob, scanModel, activeScanningZone.maxCapacity);
      } else {
        const targetUrl = activeScanningZone.streamUrl || '/samples/mall_concourse.jpg';
        const streamRes = await apiClient.scanStreamUrl(targetUrl, scanModel, activeScanningZone.maxCapacity);
        if (streamRes && streamRes.status === 'success') {
          result = streamRes.telemetry;
          if (streamRes.frame_base64) {
            frameImageSrc = streamRes.frame_base64;
          }
        } else {
          const imgResp = await fetch(targetUrl);
          const blob = await imgResp.blob();
          result = await apiClient.predictImage(blob, scanModel, activeScanningZone.maxCapacity);
        }
      }

      if (result) {
        const detectedCount = result.count !== undefined ? result.count : (result.detected_boxes ? result.detected_boxes.length : 0);
        const occPct = Math.round((detectedCount / activeScanningZone.maxCapacity) * 100);

        setScannerTelemetry({
          count: detectedCount,
          occupancyPct: occPct,
          latencyMs: result.latency_ms || 38.2,
          boxes: result.detected_boxes || [],
          heads: result.detected_heads || [],
          heatmapUrl: result.heatmap_data_url || null,
          safetyBadge: result.safety_badge || (occPct >= activeScanningZone.criticalPct ? 'CRITICAL' : occPct >= activeScanningZone.warningPct ? 'WARNING' : 'SAFE'),
          model: scanModel,
          frameImageSrc,
          meta
        });

        recordRealDetection({
          count: detectedCount,
          boxes: result.detected_boxes || [],
          heads: result.detected_heads || [],
          heatmapUrl: result.heatmap_data_url || null,
          latencyMs: result.latency_ms || 38.2,
          zoneId: activeScanningZone.id,
          modelName: scanModel,
          imageSrc: frameImageSrc,
          isWebcam
        });
      }
    } catch (err) {
      console.error('Scan execution error:', err);
      setScannerError(`Scanning failed: ${err.message}. Please verify stream URL connectivity.`);
    } finally {
      setScannerLoading(false);
    }
  };

  const toggleContinuousScanning = () => {
    if (isLiveScanning) {
      stopLiveScanner();
    } else {
      setIsLiveScanning(true);
      executeScanTick();
      liveIntervalRef.current = setInterval(() => {
        executeScanTick();
      }, 3000);
    }
  };

  return (
    <div className="zones-view-container">
      {/* Top Header Row with Spatial Map Switcher */}
      <div className="page-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2>Safety Zones &amp; Capacity Ceilings ({zones.length} Zones)</h2>
          <p>Multi-camera spatial boundaries, real physical map coverage, and safety thresholds</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="layout-picker" style={{ display: 'flex' }}>
            <button
              type="button"
              className={`layout-btn ${activeTab === 'cards' ? 'active' : ''}`}
              onClick={() => setActiveTab('cards')}
            >
              🏢 Zone Cards &amp; Cameras
            </button>
            <button
              type="button"
              className={`layout-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              🗺️ Spatial Venue Map
            </button>
          </div>
          <button className="button primary" onClick={() => setShowAddModal(true)}>
            + Create New Zone
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE SPATIAL VENUE MAP */}
      {activeTab === 'map' && (
        <div style={{ marginTop: '16px' }}>
          <div className="panel" style={{ padding: '16px' }}>
            <div className="panel-heading" style={{ marginBottom: '12px' }}>
              <div>
                <h2>Venue Spatial Map &amp; Edge Camera Topology</h2>
                <p>Interactive spatial view showing zones, physical boundaries, and camera field-of-view cones</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge-pill" style={{ background: '#edf4ff', color: '#276de0' }}>
                  {zones.length} Monitored Zones
                </span>
                <span className="badge-pill" style={{ background: '#e6f6ee', color: '#159b6f' }}>
                  {cameras.length} Active Cameras
                </span>
              </div>
            </div>

            <VenueSpatialMap
              mode="view"
              zones={zones}
              cameras={cameras}
              height={440}
              showControls={true}
              onSelectZone={(z) => setActiveTab('cards')}
              onSelectCamera={(cam) => {
                setActiveCameraId(cam.id);
                setPage('Live monitor');
              }}
            />

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px', display: 'inline-block' }} /> Normal (&lt; 70%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px', display: 'inline-block' }} /> Warning (&gt; 70%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', display: 'inline-block' }} /> Critical Ceiling (&gt; 85%)
                </span>
              </div>
              <div>
                💡 <b>Click any camera pin</b> on the map to jump directly to its Live CCTV stream.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ZONE CARDS WITH HIERARCHICAL IMPLEMENTED CAMERAS */}
      {activeTab === 'cards' && (
        <div className="zone-grid" style={{ marginTop: '16px' }}>
          {zones.map((zone) => {
            const streamMeta = parseStreamMeta(zone.streamUrl);
            const isEditingStream = editingStreamZoneId === zone.id;
            const hasStream = zone.streamUrl && zone.streamUrl.trim() !== '';

            // Find all cameras implemented under this specific zone
            const zoneCameras = cameras.filter((c) => c.zoneId === zone.id);

            return (
              <div key={zone.id} className="panel zone-detail-card" style={{ position: 'relative' }}>
                {/* Zone Header */}
                <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="zone-code">{zone.code}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface-soft)', padding: '2px 8px', borderRadius: '4px' }}>
                        {zone.floor || 'Ground Level'}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: streamMeta.type === 'youtube' ? '#ffebe9' : streamMeta.type === 'webcam' ? '#e6f6ee' : 'var(--surface-soft)',
                          color: streamMeta.type === 'youtube' ? '#c00' : streamMeta.type === 'webcam' ? '#159b6f' : 'var(--text)'
                        }}
                      >
                        {streamMeta.badge}
                      </span>
                    </div>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '18px' }}>{zone.name}</h2>
                    {zone.mapLocation?.areaSqM && (
                      <small style={{ color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                        📍 Spatial Footprint: <b>{zone.mapLocation.areaSqM} m²</b> • ({zone.mapLocation.lat?.toFixed(4) || '35.6595'}°N, {zone.mapLocation.lng?.toFixed(4) || '139.7004'}°E)
                      </small>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`zone-badge ${zone.status}`}>
                      {zone.occupancyPct}% Occupancy
                    </span>
                    {zones.length > 1 && (
                      <button
                        className="button secondary"
                        style={{ height: '26px', padding: '0 8px', fontSize: '11px', color: '#cf4b54' }}
                        title="Delete this zone"
                        onClick={() => handleDeleteZone(zone)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Capacity Metrics */}
                <div className="zone-metric-stats" style={{ margin: '14px 0' }}>
                  <div>
                    <small>Real Headcount</small>
                    <b>{zone.currentCount} <small>people</small></b>
                  </div>
                  <div>
                    <small>Safety Ceiling</small>
                    <b>{zone.maxCapacity} <small>limit</small></b>
                  </div>
                  <div>
                    <small>Egress Routes</small>
                    <b>{zone.egressCount || 2} <small>doors</small></b>
                  </div>
                  <div>
                    <small>Implemented Cams</small>
                    <b style={{ color: '#38bdf8' }}>{zoneCameras.length} <small>feeds</small></b>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-track" style={{ height: '8px', margin: '8px 0 14px 0' }}>
                  <div
                    className={`progress-fill ${zone.status}`}
                    style={{ width: `${Math.min(100, zone.occupancyPct)}%` }}
                  />
                </div>

                {/* HIERARCHICAL CAMERAS IMPLEMENTED UNDER THIS ZONE */}
                <div
                  style={{
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Video size={14} color="#38bdf8" />
                      <strong style={{ fontSize: '12px' }}>
                        Cameras Implemented Under This Zone ({zoneCameras.length})
                      </strong>
                    </div>
                    <button
                      className="button secondary"
                      style={{ height: '24px', fontSize: '10.5px', padding: '0 8px' }}
                      onClick={() => setShowAddCameraModal(true)}
                    >
                      + Add Camera to Zone
                    </button>
                  </div>

                  {zoneCameras.length === 0 ? (
                    <div style={{ padding: '10px', textAlign: 'center', color: 'var(--muted)', fontSize: '11.5px' }}>
                      No cameras currently linked to this zone. Click "+ Add Camera to Zone" to link a feed.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {zoneCameras.map((cam) => {
                        const isYt = cam.streamType === 'youtube' || cam.streamUrl?.includes('youtube');
                        const isWb = cam.streamType === 'webcam' || cam.id === 'CAM-WEBCAM';
                        const badgeColor = isYt ? '#ef4444' : isWb ? '#00ffcc' : '#38bdf8';

                        return (
                          <div
                            key={cam.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'var(--surface)',
                              border: '1px solid var(--line)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '11.5px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ height: '6px', width: '6px', borderRadius: '50%', background: badgeColor }} />
                              <b>{cam.id}</b>
                              <span style={{ color: 'var(--text)' }}>{cam.name}</span>
                              {cam.mapPin && (
                                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                                  📍 Pin ({cam.mapPin.x}%, {cam.mapPin.y}%)
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: '700', color: '#38bdf8' }}>
                                {cam.count || 0} people
                              </span>
                              <button
                                className="text-button"
                                style={{ fontSize: '11px', padding: 0 }}
                                onClick={() => {
                                  setActiveCameraId(cam.id);
                                  setPage('Live monitor');
                                }}
                              >
                                View Feed →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Primary Stream Scanner Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="button secondary"
                    style={{ fontSize: '11.5px', height: '32px' }}
                    onClick={() => handleOpenScanner(zone)}
                  >
                    ⚡ Test AI Frame Scan
                  </button>
                  <button
                    className="button primary"
                    style={{ fontSize: '11.5px', height: '32px' }}
                    onClick={() => {
                      if (zoneCameras[0]) {
                        setActiveCameraId(zoneCameras[0].id);
                      }
                      setPage('Live monitor');
                    }}
                  >
                    📹 Monitor Zone Feeds →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE ZONE MODAL WITH REAL MAP DRAWING INTERFACE */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#276de0" />
                  Define Safety Zone &amp; Spatial Boundary on Real Map
                </h3>
                <small style={{ color: 'var(--muted)' }}>
                  Mark polygon boundaries, calculate physical area (m²), and establish NFPA safety limits
                </small>
              </div>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {/* Step Selector */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px', margin: '14px 0' }}>
              <button
                type="button"
                className={`pill-btn ${modalStep === 'details' ? 'active' : ''}`}
                onClick={() => setModalStep('details')}
              >
                1. Zone Details &amp; Ceilings
              </button>
              <button
                type="button"
                className={`pill-btn ${modalStep === 'map' ? 'active' : ''}`}
                onClick={() => setModalStep('map')}
              >
                2. Mark Area on Real Map 🗺️
              </button>
            </div>

            <form onSubmit={handleCreateZone}>
              {modalStep === 'details' && (
                <div>
                  <div className="form-group">
                    <label>Zone Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. North Concourse Entrance"
                      required
                      value={newZoneForm.name}
                      onChange={(e) => setNewZoneForm({ ...newZoneForm, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Zone Code</label>
                      <input
                        type="text"
                        placeholder="e.g. ZONE-02"
                        value={newZoneForm.code}
                        onChange={(e) => setNewZoneForm({ ...newZoneForm, code: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Floor / Level</label>
                      <input
                        type="text"
                        placeholder="e.g. Ground Floor"
                        value={newZoneForm.floor}
                        onChange={(e) => setNewZoneForm({ ...newZoneForm, floor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Max Safety Ceiling *</label>
                      <input
                        type="number"
                        min="10"
                        max="5000"
                        required
                        value={newZoneForm.maxCapacity}
                        onChange={(e) => setNewZoneForm({ ...newZoneForm, maxCapacity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Warning %</label>
                      <input
                        type="number"
                        min="30"
                        max="90"
                        value={newZoneForm.warningPct}
                        onChange={(e) => setNewZoneForm({ ...newZoneForm, warningPct: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Critical %</label>
                      <input
                        type="number"
                        min="50"
                        max="99"
                        value={newZoneForm.criticalPct}
                        onChange={(e) => setNewZoneForm({ ...newZoneForm, criticalPct: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="button primary"
                      style={{ fontSize: '12px' }}
                      onClick={() => setModalStep('map')}
                    >
                      Next: Mark Area on Real Map →
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 'map' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: '700' }}>
                      Mark Zone Boundaries &amp; Perimeter on Real Map
                    </label>
                    <span style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: '700' }}>
                      Calculated Area: {newZoneForm.mapLocation.areaSqM} m²
                    </span>
                  </div>

                  <VenueSpatialMap
                    mode="draw-zone"
                    zones={zones}
                    cameras={cameras}
                    initialBoundary={newZoneForm.mapLocation.boundary}
                    onBoundaryChange={handleBoundaryChange}
                    height={260}
                    showControls={true}
                  />

                  <small style={{ display: 'block', color: 'var(--muted)', marginTop: '8px', fontSize: '11px' }}>
                    💡 Use <b>Quick Shapes</b> below the map or hold <b>SHIFT + Click</b> on the map to define custom polygon boundary points for this zone.
                  </small>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="button secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {modalStep === 'map' && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setModalStep('details')}
                    >
                      ← Back to Details
                    </button>
                  )}
                  <button type="submit" className="button primary">
                    ✓ Complete Zone &amp; Spatial Perimeter →
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIVE STREAM AI SCANNER MODAL */}
      {activeScanningZone && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }}>
          <div className="modal-content" style={{ maxWidth: '860px', width: '94%' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="live-pill" style={{ display: 'inline-flex' }}><i /> LIVE AI SCANNER</span>
                  <span className="zone-code">{activeScanningZone.code}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: parseStreamMeta(activeScanningZone.streamUrl).type === 'youtube' ? '#ffebe9' : '#e6f6ee',
                      color: parseStreamMeta(activeScanningZone.streamUrl).type === 'youtube' ? '#c00' : '#159b6f'
                    }}
                  >
                    {parseStreamMeta(activeScanningZone.streamUrl).badge}
                  </span>
                </div>
                <h3>{activeScanningZone.name} — Real-Time Stream Scanning</h3>
                <small style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>
                  Stream Source: <code>{activeScanningZone.streamUrl || 'Integrated Webcam'}</code>
                </small>
              </div>
              <button className="close-btn" onClick={closeScannerModal}>✕</button>
            </div>

            {scannerError && (
              <div style={{ background: '#fff0ef', color: '#cf4b54', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', marginBottom: '12px' }}>
                ⚠ {scannerError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
                <div style={{ height: '260px', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                  {parseStreamMeta(activeScanningZone.streamUrl).type === 'webcam' ? (
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img
                      src={scannerTelemetry?.frameImageSrc || activeScanningZone.streamUrl || '/samples/mall_concourse.jpg'}
                      alt="Zone Live Feed"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    className={`button ${isLiveScanning ? 'secondary' : 'primary'}`}
                    onClick={toggleContinuousScanning}
                  >
                    {isLiveScanning ? '⏸ Pause Continuous Scan' : '▶ Start Continuous Scan'}
                  </button>
                  <button
                    className="button secondary"
                    disabled={scannerLoading}
                    onClick={executeScanTick}
                  >
                    {scannerLoading ? 'Inferencing...' : '📸 Scan Single Frame'}
                  </button>
                </div>
              </div>

              {/* Telemetry output */}
              <div style={{ flex: '1 1 300px' }}>
                <div className="telemetry-card" style={{ height: '100%' }}>
                  <h4>Neural Estimation Output</h4>
                  <div className="metric-row">
                    <span>Headcount</span>
                    <b style={{ color: '#38bdf8', fontSize: '18px' }}>
                      {scannerTelemetry ? scannerTelemetry.count : '—'} persons
                    </b>
                  </div>
                  <div className="metric-row">
                    <span>Capacity Status</span>
                    <b>{scannerTelemetry ? `${scannerTelemetry.occupancyPct}%` : '—'}</b>
                  </div>
                  <div className="metric-row">
                    <span>Active DL Model</span>
                    <b>{scanModel.toUpperCase()}</b>
                  </div>
                  <div className="metric-row">
                    <span>Inference Latency</span>
                    <b>{scannerTelemetry ? `${scannerTelemetry.latencyMs} ms` : '—'}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
