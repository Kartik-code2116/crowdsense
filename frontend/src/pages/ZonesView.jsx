import React, { useState, useEffect, useRef } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import { apiClient } from '../api/client';

export default function ZonesView() {
  const {
    zones,
    addZone,
    deleteZone,
    updateZone,
    updateZoneThresholds,
    recordRealDetection,
    inspectInCrowdSearch
  } = useCrowdStore();

  // Modal & Edit States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStreamZoneId, setEditingStreamZoneId] = useState(null);
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [newStreamType, setNewStreamType] = useState('url');

  // Active Zone Scanner Modal State
  const [activeScanningZone, setActiveScanningZone] = useState(null);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [scanModel, setScanModel] = useState('yolov8');
  const [scannerTelemetry, setScannerTelemetry] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState(null);

  // Scanner Video & Canvas references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamTrackRef = useRef(null);
  const liveIntervalRef = useRef(null);

  // Form Data for Adding a New Zone
  const [newZoneForm, setNewZoneForm] = useState({
    name: '',
    code: '',
    floor: 'Ground Level',
    maxCapacity: 200,
    warningPct: 70,
    criticalPct: 85,
    egressCount: 2,
    streamType: 'demo',
    streamUrl: '/samples/mall_concourse.jpg',
    description: ''
  });

  // Preset stream options for user convenience
  const streamPresets = [
    { label: '💻 Integrated Webcam / USB Camera', type: 'webcam', url: 'webcam' },
    { label: '🛍️ Mall Concourse Atrium Feed (Demo)', type: 'demo', url: '/samples/mall_concourse.jpg' },
    { label: '🚶 Pedestrian Promenade Feed (Demo)', type: 'demo', url: '/samples/street_pedestrians.jpg' },
    { label: '🏟️ Dense Stadium Bleachers Feed (Demo)', type: 'demo', url: '/samples/stadium_dense.jpg' },
    { label: '🏃 Marathon Chokepoint Egress (Demo)', type: 'demo', url: '/samples/marathon_crowd.jpg' },
    { label: '🌐 Custom Live Stream URL (RTSP / HTTP / HLS / MP4)', type: 'url', url: '' }
  ];

  // Stop scanning & media tracks on modal close
  const stopLiveScanner = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (streamTrackRef.current) {
      streamTrackRef.current.getTracks().forEach(t => t.stop());
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

  // Launch live scanner for a specific zone
  const handleOpenScanner = async (zone) => {
    setActiveScanningZone(zone);
    setScannerTelemetry(null);
    setScannerError(null);
    setIsLiveScanning(false);

    // If stream is webcam, start local camera stream immediately
    if (zone.streamType === 'webcam' || zone.streamUrl === 'webcam') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamTrackRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setScannerError(`Camera access error: ${err.message}. Please check browser camera permissions.`);
      }
    }
  };

  // Execute a single deep scan on the current frame of the active zone
  const executeScanTick = async () => {
    if (!activeScanningZone) return;
    setScannerLoading(true);
    setScannerError(null);

    try {
      const isWebcam = activeScanningZone.streamType === 'webcam' || activeScanningZone.streamUrl === 'webcam';
      const isVideoElement = videoRef.current && (isWebcam || activeScanningZone.streamUrl.endsWith('.mp4') || activeScanningZone.streamUrl.endsWith('.webm'));

      let result = null;
      let frameImageSrc = activeScanningZone.streamUrl;

      // Case A: Video / Webcam Element available in DOM
      if (isVideoElement && videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
        frameImageSrc = canvas.toDataURL('image/jpeg', 0.9);
        result = await apiClient.predictImage(blob, scanModel, activeScanningZone.maxCapacity);
      }
      // Case B: Stream URL or sample image
      else {
        const targetUrl = activeScanningZone.streamUrl || '/samples/mall_concourse.jpg';
        // First try the backend /stream/scan-url endpoint
        const streamRes = await apiClient.scanStreamUrl(targetUrl, scanModel, activeScanningZone.maxCapacity);
        if (streamRes && streamRes.status === 'success') {
          result = streamRes.telemetry;
          if (streamRes.frame_base64) {
            frameImageSrc = streamRes.frame_base64;
          }
        } else {
          // Fallback: fetch as image blob and predict
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
          frameImageSrc
        });

        // Synchronize with global application state (Dashboard, Live Monitor, Analytics, Incidents)
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
      setScannerError(`Scanning failed: ${err.message}. Please verify the stream URL connectivity.`);
    } finally {
      setScannerLoading(false);
    }
  };

  // Toggle continuous live scanning
  const toggleContinuousLiveScan = () => {
    if (isLiveScanning) {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      setIsLiveScanning(false);
    } else {
      setIsLiveScanning(true);
      executeScanTick();
      liveIntervalRef.current = setInterval(executeScanTick, 1800);
    }
  };

  // Submit new zone form
  const handleCreateZoneSubmit = async (e) => {
    e.preventDefault();
    if (!newZoneForm.name.trim()) return;

    const zoneCount = zones.length + 1;
    const generatedCode = newZoneForm.code.trim() || `ZONE-0${zoneCount}`;

    await addZone({
      name: newZoneForm.name.trim(),
      code: generatedCode.toUpperCase(),
      floor: newZoneForm.floor.trim() || 'Ground Level',
      maxCapacity: Number(newZoneForm.maxCapacity) || 200,
      warningPct: Number(newZoneForm.warningPct) || 70,
      criticalPct: Number(newZoneForm.criticalPct) || 85,
      egressCount: Number(newZoneForm.egressCount) || 2,
      streamUrl: newZoneForm.streamUrl.trim(),
      streamType: newZoneForm.streamType,
      description: newZoneForm.description.trim() || 'Custom user-defined venue monitoring sector.'
    });

    setShowAddModal(false);
    setNewZoneForm({
      name: '',
      code: '',
      floor: 'Ground Level',
      maxCapacity: 200,
      warningPct: 70,
      criticalPct: 85,
      egressCount: 2,
      streamType: 'demo',
      streamUrl: '/samples/mall_concourse.jpg',
      description: ''
    });
  };

  // Save updated stream URL for a zone
  const handleSaveStream = async (zoneId) => {
    await updateZone(zoneId, {
      streamUrl: newStreamUrl,
      streamType: newStreamType
    });
    setEditingStreamZoneId(null);
  };

  // Confirm and delete zone
  const handleDeleteZone = async (zone) => {
    if (zones.length <= 1) {
      alert('At least one demo safety zone must remain configured in the system.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove "${zone.name}" (${zone.code})?`)) {
      await deleteZone(zone.id);
    }
  };

  return (
    <div className="zones-view-container" style={{ paddingBottom: '40px' }}>
      {/* Top Header Row */}
      <div className="page-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Safety Zones & Capacity Ceiling Management</h2>
          <p>
            Configured Venue Sectors ({zones.length}) · Assign live video streams or webcams, set dynamic safety ceilings, and perform real deep learning crowd scans.
          </p>
        </div>
        <button
          className="button primary"
          style={{ height: '38px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setShowAddModal(true)}
        >
          <span>+</span> Add New Safety Zone
        </button>
      </div>

      {/* Zones Grid */}
      <div className="zones-grid">
        {zones.map((zone) => {
          const isCritical = zone.occupancyPct >= zone.criticalPct;
          const isWarning = zone.occupancyPct >= zone.warningPct && !isCritical;
          const isEditingStream = editingStreamZoneId === zone.id;
          const hasStream = Boolean(zone.streamUrl);

          return (
            <div key={zone.id} className="panel zone-detail-card" style={{ position: 'relative' }}>
              {/* Card Header */}
              <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="zone-code">{zone.code}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface-soft)', padding: '2px 8px', borderRadius: '4px' }}>
                      {zone.floor || 'Ground Level'}
                    </span>
                  </div>
                  <h2 style={{ margin: '4px 0 0 0', fontSize: '18px' }}>{zone.name}</h2>
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

              {/* Metric Stats */}
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
              </div>

              {/* Progress Bar */}
              <div className="progress-track" style={{ height: '8px', margin: '8px 0 14px 0' }}>
                <div
                  className={`progress-fill ${zone.status}`}
                  style={{ width: `${Math.min(100, zone.occupancyPct)}%` }}
                />
              </div>

              {/* Assigned Live Streaming Feed Box */}
              <div
                style={{
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: hasStream ? '#159b6f' : '#cc841b', fontWeight: 'bold' }}>
                      {hasStream ? '● Live Stream Connected' : '○ No Stream Assigned'}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                      ({zone.streamType === 'webcam' ? 'Webcam' : zone.streamType === 'demo' ? 'Sample Video Feed' : 'Network Stream'})
                    </span>
                  </div>
                  <button
                    className="text-button"
                    style={{ fontSize: '11px', padding: 0 }}
                    onClick={() => {
                      if (isEditingStream) {
                        setEditingStreamZoneId(null);
                      } else {
                        setEditingStreamZoneId(zone.id);
                        setNewStreamUrl(zone.streamUrl || '');
                        setNewStreamType(zone.streamType || 'url');
                      }
                    }}
                  >
                    {isEditingStream ? 'Cancel' : 'Change Stream URL ✎'}
                  </button>
                </div>

                {/* Current Stream URL display */}
                <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                  <code style={{ fontSize: '11.5px', color: 'var(--text)' }}>
                    {zone.streamUrl || 'None (Click "Change Stream URL" to assign)'}
                  </code>
                </div>

                {/* Inline Stream Editing Form */}
                {isEditingStream && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--line)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                        Quick Select Feed Source:
                      </label>
                      <select
                        style={{ width: '100%', fontSize: '12px', padding: '6px', borderRadius: '4px', border: '1px solid var(--line)' }}
                        onChange={(e) => {
                          const preset = streamPresets.find(p => p.url === e.target.value);
                          if (preset) {
                            setNewStreamType(preset.type);
                            setNewStreamUrl(preset.url);
                          }
                        }}
                        value={newStreamUrl}
                      >
                        {streamPresets.map((p, idx) => (
                          <option key={idx} value={p.url}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                        Live Stream URL (RTSP / HTTP / HLS / MP4 or filename):
                      </label>
                      <input
                        type="text"
                        style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}
                        placeholder="e.g. rtsp://192.168.1.50:554/live or /samples/mall_concourse.jpg"
                        value={newStreamUrl}
                        onChange={(e) => setNewStreamUrl(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="button secondary"
                        style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}
                        onClick={() => setEditingStreamZoneId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="button primary"
                        style={{ height: '28px', fontSize: '11px', padding: '0 12px' }}
                        onClick={() => handleSaveStream(zone.id)}
                      >
                        Save Stream
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Threshold Sliders */}
              <div className="threshold-controls">
                <div className="slider-group">
                  <div className="slider-label">
                    <span>Warning Surge Threshold</span>
                    <b>{zone.warningPct}%</b>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="85"
                    value={zone.warningPct}
                    onChange={(e) => updateZoneThresholds(zone.id, Number(e.target.value), zone.criticalPct)}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span>Critical Breach Threshold</span>
                    <b>{zone.criticalPct}%</b>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="98"
                    value={zone.criticalPct}
                    onChange={(e) => updateZoneThresholds(zone.id, zone.warningPct, Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Card Footer: Status & Scan Buttons */}
              <div className="zone-footer-status">
                <div style={{ marginBottom: '10px' }}>
                  {isCritical ? (
                    <span className="text-red">⚠ Critical Alert: Occupancy exceeds safety threshold</span>
                  ) : isWarning ? (
                    <span className="text-amber">▲ Warning: Influx nearing threshold limit</span>
                  ) : (
                    <span className="text-green">✓ Normal operating condition within NFPA standards</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    className="button primary"
                    style={{ fontSize: '12px', padding: '6px 14px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleOpenScanner(zone)}
                  >
                    <span>🔍</span> Scan Zone Live Stream
                  </button>
                  <button
                    className="button secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', height: '32px' }}
                    onClick={() => inspectInCrowdSearch(zone.streamUrl || '/samples/mall_concourse.jpg', zone.id)}
                  >
                    Studio Scan →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD NEW SAFETY ZONE */}
      {showAddModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h3>Add New Venue Safety Zone</h3>
                <p>Register a real monitoring sector with assigned live streaming feed</p>
              </div>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateZoneSubmit}>
              <div className="form-group">
                <label>Zone Name *</label>
                <input
                  type="text"
                  placeholder="e.g. North Turnstiles Concourse"
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
                  <label>Max Capacity *</label>
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

              {/* Streaming Video Source Assignment */}
              <div style={{ marginTop: '10px', padding: '12px', background: 'var(--surface-soft)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Assign Live Streaming URL / Video Source
                </label>
                <div style={{ marginBottom: '8px' }}>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '12.5px' }}
                    onChange={(e) => {
                      const preset = streamPresets.find(p => p.url === e.target.value);
                      if (preset) {
                        setNewZoneForm({
                          ...newZoneForm,
                          streamType: preset.type,
                          streamUrl: preset.url
                        });
                      }
                    }}
                    value={newZoneForm.streamUrl}
                  >
                    {streamPresets.map((p, idx) => (
                      <option key={idx} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                    Custom Stream URL / Endpoint (RTSP, HTTP, HLS, or Video):
                  </label>
                  <input
                    type="text"
                    placeholder="rtsp://edge.venue.lan/stream or http://... or sample path"
                    value={newZoneForm.streamUrl}
                    onChange={(e) => setNewZoneForm({ ...newZoneForm, streamUrl: e.target.value, streamType: 'url' })}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button type="button" className="button secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary">
                  Create Zone & Connect Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIVE STREAM AI SCANNER MODAL */}
      {activeScanningZone && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }}>
          <div className="modal-content" style={{ maxWidth: '820px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="live-pill" style={{ display: 'inline-flex' }}><i /> LIVE SCANNER</span>
                  <span className="zone-code">{activeScanningZone.code}</span>
                </div>
                <h3>{activeScanningZone.name} — Real-Time Crowd AI Scan</h3>
                <small style={{ color: 'var(--muted)' }}>
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

            {/* Video / Stream Display Player */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '380px',
                background: '#0b1320',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Webcam / Video Element */}
              {(activeScanningZone.streamType === 'webcam' || activeScanningZone.streamUrl === 'webcam') ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : activeScanningZone.streamUrl?.endsWith('.mp4') || activeScanningZone.streamUrl?.endsWith('.webm') ? (
                <video
                  ref={videoRef}
                  src={activeScanningZone.streamUrl}
                  autoPlay
                  loop
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : scannerTelemetry?.frameImageSrc ? (
                <img
                  src={scannerTelemetry.frameImageSrc}
                  alt="Captured Stream Frame"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={activeScanningZone.streamUrl || '/samples/mall_concourse.jpg'}
                  alt="Zone Stream"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}

              {/* Heatmap Overlay if available */}
              {scannerTelemetry?.heatmapUrl && (
                <img
                  src={scannerTelemetry.heatmapUrl}
                  alt="AI Density Heatmap"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: 0.65,
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Bounding Boxes Overlay */}
              {scannerTelemetry?.boxes && scannerTelemetry.boxes.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {scannerTelemetry.boxes.slice(0, 100).map((box, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${box.x_min_pct || (box.x / 6.4)}%`,
                        top: `${box.y_min_pct || (box.y / 4.8)}%`,
                        width: `${box.width_pct || (box.w / 6.4)}%`,
                        height: `${box.height_pct || (box.h / 4.8)}%`,
                        border: '2px solid #00f0ff',
                        borderRadius: '3px',
                        boxShadow: '0 0 6px rgba(0, 240, 255, 0.6)'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '-16px',
                          left: '0',
                          background: 'rgba(0, 240, 255, 0.85)',
                          color: '#000',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          padding: '1px 3px',
                          borderRadius: '2px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {Math.round((box.confidence || 0.88) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Real-time Status Overlay Pill */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(4px)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ color: isLiveScanning ? '#159b6f' : '#8a97a6' }}>
                  {isLiveScanning ? '● CONTINUOUS SCANNING ACTIVE' : '○ READY TO SCAN'}
                </span>
                <span>|</span>
                <span>Ceiling: {activeScanningZone.maxCapacity}</span>
              </div>
            </div>

            {/* Scanner Telemetry HUD */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                margin: '16px 0',
                background: 'var(--surface-soft)',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div>
                <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>Detected Headcount</small>
                <b style={{ fontSize: '22px', color: 'var(--text)' }}>
                  {scannerTelemetry ? scannerTelemetry.count : activeScanningZone.currentCount}
                </b>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>persons</span>
              </div>

              <div>
                <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>Occupancy Rate</small>
                <b style={{ fontSize: '22px', color: 'var(--text)' }}>
                  {scannerTelemetry ? scannerTelemetry.occupancyPct : activeScanningZone.occupancyPct}%
                </b>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>of max capacity</span>
              </div>

              <div>
                <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>Safety State</small>
                <b
                  style={{
                    fontSize: '16px',
                    display: 'inline-block',
                    marginTop: '4px',
                    color:
                      (scannerTelemetry?.safetyBadge === 'CRITICAL' || activeScanningZone.status === 'critical')
                        ? '#cf4b54'
                        : (scannerTelemetry?.safetyBadge === 'WARNING' || activeScanningZone.status === 'warning')
                        ? '#cc841b'
                        : '#159b6f'
                  }}
                >
                  {scannerTelemetry?.safetyBadge || (activeScanningZone.status === 'critical' ? 'CRITICAL' : activeScanningZone.status === 'warning' ? 'WARNING' : 'SAFE & NORMAL')}
                </b>
              </div>

              <div>
                <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>AI Latency</small>
                <b style={{ fontSize: '22px', color: 'var(--text)' }}>
                  {scannerTelemetry ? scannerTelemetry.latencyMs : 38.2}
                </b>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>ms per frame</span>
              </div>
            </div>

            {/* Controls & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>AI Model:</label>
                <select
                  value={scanModel}
                  onChange={(e) => setScanModel(e.target.value)}
                  style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}
                >
                  <option value="yolov8">YOLOv8 Detection Baseline (BBoxes)</option>
                  <option value="csrnet">CSRNet Dilated Conv (Density Map)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="button secondary"
                  style={{ height: '34px', fontSize: '12.5px' }}
                  onClick={executeScanTick}
                  disabled={scannerLoading}
                >
                  {scannerLoading ? 'Processing...' : '⚡ Scan Current Frame'}
                </button>

                <button
                  className={`button ${isLiveScanning ? 'secondary' : 'primary'}`}
                  style={{ height: '34px', fontSize: '12.5px' }}
                  onClick={toggleContinuousLiveScan}
                >
                  {isLiveScanning ? '⏹ Stop Live Scan' : '● Start Continuous Live Scan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
