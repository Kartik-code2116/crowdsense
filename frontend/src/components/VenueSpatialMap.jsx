import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Video,
  Radio,
  Eye,
  Check,
  RotateCcw,
  Square,
  Shield,
  AlertTriangle
} from 'lucide-react';

/**
 * Standard preset geographic venue locations for rapid alignment
 */
export const VENUE_PRESETS = [
  { id: 'arena', name: 'Metropolitan Arena & Stadium', lat: 35.6595, lng: 139.7004, zoom: 17, scaleM: 250 },
  { id: 'times_square', name: 'Broadway Plaza & Times Square', lat: 40.7580, lng: -73.9855, zoom: 17, scaleM: 300 },
  { id: 'convention', name: 'Convention Center Concourse', lat: 37.7840, lng: -122.4014, zoom: 18, scaleM: 180 },
  { id: 'campus', name: 'University Campus Plaza', lat: 51.5007, lng: -0.1246, zoom: 18, scaleM: 150 }
];

export default function VenueSpatialMap({
  mode = 'view', // 'view' | 'draw-zone' | 'pick-camera'
  zones = [],
  cameras = [],
  activeZoneId = null,
  activeCameraId = null,
  initialBoundary = [],
  initialPin = null,
  onBoundaryChange = null,
  onPinChange = null,
  onSelectZone = null,
  onSelectCamera = null,
  height = 360,
  showControls = true
}) {
  const containerRef = useRef(null);
  const [mapPreset, setMapPreset] = useState(VENUE_PRESETS[0]);
  const [mapTheme, setMapTheme] = useState('blueprint'); // 'blueprint' (dark GIS) | 'street' (OSM tiles) | 'satellite'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Draw Zone State (Polygon Vertices in 0-100 percentage coordinates)
  const [drawnPoints, setDrawnPoints] = useState(() => {
    if (initialBoundary && initialBoundary.length >= 3) return initialBoundary;
    return [
      { x: 25, y: 30 },
      { x: 75, y: 30 },
      { x: 75, y: 70 },
      { x: 25, y: 70 }
    ];
  });

  // Camera Pin State (x, y in percentage [0-100], bearing angle in degrees)
  const [cameraPin, setCameraPin] = useState(() => {
    if (initialPin && initialPin.x !== undefined) return initialPin;
    return { x: 50, y: 50, bearing: 'South-East', angle: 135, fov: 75 };
  });

  // Calculate polygon area in square meters (scaled to venue scale)
  const calculatedArea = useMemo(() => {
    if (drawnPoints.length < 3) return 0;
    let area = 0;
    const n = drawnPoints.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += drawnPoints[i].x * drawnPoints[j].y;
      area -= drawnPoints[j].x * drawnPoints[i].y;
    }
    area = Math.abs(area) / 2; // in percentage unit [0 - 10000]
    // Scale to real square meters based on mapPreset.scaleM
    const realAreaM2 = Math.round((area / 10000) * (mapPreset.scaleM * mapPreset.scaleM));
    return Math.max(80, realAreaM2);
  }, [drawnPoints, mapPreset]);

  // Sync boundary changes up to parent
  useEffect(() => {
    if (mode === 'draw-zone' && onBoundaryChange) {
      const centerLat = mapPreset.lat + (50 - (drawnPoints[0]?.y || 50)) * 0.00005;
      const centerLng = mapPreset.lng + ((drawnPoints[0]?.x || 50) - 50) * 0.00005;
      onBoundaryChange({
        boundary: drawnPoints,
        areaSqM: calculatedArea,
        lat: Number(centerLat.toFixed(6)),
        lng: Number(centerLng.toFixed(6)),
        presetId: mapPreset.id
      });
    }
  }, [drawnPoints, calculatedArea, mode, mapPreset]);

  // Sync pin changes up to parent
  useEffect(() => {
    if (mode === 'pick-camera' && onPinChange) {
      const pinLat = mapPreset.lat + (50 - cameraPin.y) * 0.00005;
      const pinLng = mapPreset.lng + (cameraPin.x - 50) * 0.00005;
      onPinChange({
        ...cameraPin,
        lat: Number(pinLat.toFixed(6)),
        lng: Number(pinLng.toFixed(6))
      });
    }
  }, [cameraPin, mode, mapPreset]);

  // Handle Mouse Pan
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    // In draw-zone or pick-camera mode, clicking is used for placement
    if (mode === 'pick-camera') {
      placeCameraPin(e);
      return;
    }
    if (mode === 'draw-zone' && e.shiftKey) {
      addPolygonPoint(e);
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Convert click client coordinates to [0-100] percentage coordinates on map canvas
  const getRelativeCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left - pan.x;
    const rawY = e.clientY - rect.top - pan.y;
    const normX = Math.max(5, Math.min(95, Math.round((rawX / (rect.width * zoom)) * 100)));
    const normY = Math.max(5, Math.min(95, Math.round((rawY / (rect.height * zoom)) * 100)));
    return { x: normX, y: normY };
  };

  const placeCameraPin = (e) => {
    const coords = getRelativeCoords(e);
    setCameraPin((prev) => ({
      ...prev,
      x: coords.x,
      y: coords.y
    }));
  };

  const addPolygonPoint = (e) => {
    const coords = getRelativeCoords(e);
    setDrawnPoints((prev) => [...prev, coords]);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Quick Preset Shapes for Zone Boundary
  const applyPresetShape = (shape) => {
    if (shape === 'rectangle') {
      setDrawnPoints([
        { x: 20, y: 25 },
        { x: 80, y: 25 },
        { x: 80, y: 75 },
        { x: 20, y: 75 }
      ]);
    } else if (shape === 'l_shape') {
      setDrawnPoints([
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 80 },
        { x: 20, y: 80 }
      ]);
    } else if (shape === 'corridor') {
      setDrawnPoints([
        { x: 15, y: 40 },
        { x: 85, y: 40 },
        { x: 85, y: 60 },
        { x: 15, y: 60 }
      ]);
    }
  };

  // Turn point array into SVG polygon points string
  const pointsToSvg = (pts) => pts.map((p) => `${p.x * 5},${p.y * 3.2}`).join(' ');

  // Active Zone to highlight
  const selectedZone = zones.find((z) => z.id === activeZoneId) || zones[0];

  return (
    <div
      className="venue-spatial-map-container"
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
        borderRadius: '10px',
        border: '1px solid var(--line)',
        background: mapTheme === 'blueprint' ? '#0a1017' : mapTheme === 'street' ? '#e5e3df' : '#040b11',
        userSelect: 'none'
      }}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. Real OpenStreetMap Raster Layer (loads when in 'street' theme) */}
      {mapTheme === 'street' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.85,
            pointerEvents: 'none',
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.15) 100%), url('https://tile.openstreetmap.org/17/116499/51624.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'contrast(1.05)'
          }}
        />
      )}

      {/* 2. Interactive SVG Map Surface (Zones, Polygons, Coordinates, and Camera Pins) */}
      <svg
        viewBox="0 0 500 320"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          cursor: mode === 'pick-camera' ? 'crosshair' : mode === 'draw-zone' ? 'copy' : 'grab'
        }}
      >
        <defs>
          {/* Blueprint Grid Pattern */}
          <pattern id="grid-pattern" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.8" />
          </pattern>
          <pattern id="major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1.2" />
          </pattern>

          {/* Gradients for Camera FOV Cones */}
          <radialGradient id="cam-cone-grad" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#00ffcc" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Blueprint background grid */}
        <rect width="500" height="320" fill="url(#grid-pattern)" />
        <rect width="500" height="320" fill="url(#major-grid)" />

        {/* Outer Venue Perimeter outline */}
        <rect
          x="30"
          y="20"
          width="440"
          height="280"
          rx="14"
          fill="rgba(15, 23, 42, 0.45)"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* Existing Safety Zones Boundaries */}
        {zones.map((zone) => {
          const isSelected = zone.id === activeZoneId;
          const occPct = zone.occupancyPct || Math.round(((zone.currentCount || 0) / (zone.maxCapacity || 350)) * 100);
          const isCritical = occPct >= (zone.criticalPct || 85);
          const isWarning = occPct >= (zone.warningPct || 70) && !isCritical;

          const fillColor = isCritical
            ? 'rgba(239, 68, 68, 0.22)'
            : isWarning
            ? 'rgba(245, 158, 11, 0.22)'
            : 'rgba(34, 197, 94, 0.16)';

          const strokeColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

          // Use zone boundary polygon if present, else fallback to proportional zone rectangle
          const defaultPoints = [
            { x: 12, y: 15 },
            { x: 50, y: 15 },
            { x: 50, y: 55 },
            { x: 12, y: 55 }
          ];
          const rawPts = zone.mapLocation?.boundary || defaultPoints;
          const svgPts = pointsToSvg(rawPts);

          // Find center point for label
          const avgX = rawPts.reduce((acc, p) => acc + p.x, 0) / rawPts.length;
          const avgY = rawPts.reduce((acc, p) => acc + p.y, 0) / rawPts.length;

          return (
            <g
              key={zone.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectZone) onSelectZone(zone);
              }}
              style={{ cursor: 'pointer' }}
            >
              <polygon
                points={svgPts}
                fill={isSelected ? 'rgba(56, 189, 248, 0.32)' : fillColor}
                stroke={isSelected ? '#38bdf8' : strokeColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isSelected ? 'none' : 'none'}
              />

              {/* Zone Name Label & Live Headcount on Map */}
              <text
                x={avgX * 5}
                y={avgY * 3.2 - 6}
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="700"
                textAnchor="middle"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {zone.name}
              </text>
              <text
                x={avgX * 5}
                y={avgY * 3.2 + 8}
                fill={strokeColor}
                fontSize="8.5"
                fontWeight="800"
                textAnchor="middle"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {zone.currentCount || 0} / {zone.maxCapacity || 350} ({occPct}%)
              </text>
            </g>
          );
        })}

        {/* Active Zone Creation Polygon in 'draw-zone' mode */}
        {mode === 'draw-zone' && (
          <g>
            <polygon
              points={pointsToSvg(drawnPoints)}
              fill="rgba(56, 189, 248, 0.28)"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
            {drawnPoints.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x * 5}
                cy={p.y * 3.2}
                r="4.5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ cursor: 'pointer' }}
              />
            ))}
          </g>
        )}

        {/* Real Implemented Cameras Pinned in Zones */}
        {cameras.map((cam) => {
          const isSelected = cam.id === activeCameraId;
          const pinX = (cam.mapPin?.x || (cam.id === 'CAM-01' ? 32 : cam.id === 'CAM-WEBCAM' ? 46 : 65)) * 5;
          const pinY = (cam.mapPin?.y || (cam.id === 'CAM-01' ? 35 : cam.id === 'CAM-WEBCAM' ? 42 : 55)) * 3.2;

          const isYt = cam.streamType === 'youtube' || cam.streamUrl?.includes('youtube');
          const isWb = cam.streamType === 'webcam' || cam.id === 'CAM-WEBCAM';
          const pinColor = isYt ? '#ef4444' : isWb ? '#00ffcc' : '#38bdf8';

          return (
            <g
              key={cam.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectCamera) onSelectCamera(cam);
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* Camera Field of View (FOV) Visual Cone */}
              <path
                d={`M ${pinX} ${pinY} L ${pinX - 22} ${pinY + 38} L ${pinX + 22} ${pinY + 38} Z`}
                fill="url(#cam-cone-grad)"
                transform={`rotate(${cam.mapPin?.angle || 0}, ${pinX}, ${pinY})`}
                opacity={isSelected ? 0.9 : 0.6}
              />

              {/* Pulsing ring for active camera */}
              <circle cx={pinX} cy={pinY} r={isSelected ? 10 : 7} fill={pinColor} opacity={0.3}>
                <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Central Camera Hardware Pin */}
              <circle
                cx={pinX}
                cy={pinY}
                r={isSelected ? 6 : 4.5}
                fill={pinColor}
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Camera Name Tag */}
              <rect
                x={pinX - 28}
                y={pinY - 18}
                width="56"
                height="12"
                rx="3"
                fill="rgba(10, 16, 23, 0.88)"
                stroke={pinColor}
                strokeWidth="0.8"
              />
              <text
                x={pinX}
                y={pinY - 9}
                fill="#ffffff"
                fontSize="7.5"
                fontWeight="700"
                textAnchor="middle"
              >
                {cam.id}: {cam.count || 0}
              </text>
            </g>
          );
        })}

        {/* In 'pick-camera' mode: Render Candidate Placement Pin */}
        {mode === 'pick-camera' && (
          <g>
            {/* FOV Cone */}
            <path
              d={`M ${cameraPin.x * 5} ${cameraPin.y * 3.2} L ${cameraPin.x * 5 - 28} ${cameraPin.y * 3.2 + 48} L ${cameraPin.x * 5 + 28} ${cameraPin.y * 3.2 + 48} Z`}
              fill="url(#cam-cone-grad)"
              transform={`rotate(${cameraPin.angle || 0}, ${cameraPin.x * 5}, ${cameraPin.y * 3.2})`}
            />

            {/* Glowing drop pin */}
            <circle cx={cameraPin.x * 5} cy={cameraPin.y * 3.2} r="14" fill="#00ffcc" opacity="0.3">
              <animate attributeName="r" values="10;18;10" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle
              cx={cameraPin.x * 5}
              cy={cameraPin.y * 3.2}
              r="7"
              fill="#00ffcc"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={cameraPin.x * 5}
              y={cameraPin.y * 3.2 - 12}
              fill="#00ffcc"
              fontSize="9"
              fontWeight="800"
              textAnchor="middle"
              style={{ textShadow: '0 2px 4px #000' }}
            >
              📍 NEW CAMERA HERE
            </text>
          </g>
        )}
      </svg>

      {/* 3. Top Map Telemetry Bar */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            background: 'rgba(10, 16, 23, 0.88)',
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto'
          }}
        >
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#00ffcc' }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', letterSpacing: '0.3px' }}>
            {mapPreset.name.toUpperCase()}
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
            ({mapPreset.lat.toFixed(4)}°N, {mapPreset.lng.toFixed(4)}°E)
          </span>
        </div>

        {/* Mode specific instructions badge */}
        {mode === 'draw-zone' && (
          <div
            style={{
              background: 'rgba(39, 109, 224, 0.92)',
              color: '#fff',
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            ✏️ SHIFT + CLICK on map to add boundary points • Area: {calculatedArea} m²
          </div>
        )}

        {mode === 'pick-camera' && (
          <div
            style={{
              background: 'rgba(0, 255, 204, 0.25)',
              border: '1px solid #00ffcc',
              color: '#00ffcc',
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '800',
              pointerEvents: 'auto'
            }}
          >
            📍 CLICK anywhere on map to position Camera inside {selectedZone?.name || 'Selected Zone'}
          </div>
        )}

        {/* View Mode Map Theme Selector */}
        {showControls && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(10, 16, 23, 0.88)',
              padding: '3px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              pointerEvents: 'auto'
            }}
          >
            <button
              type="button"
              className={`pill-btn ${mapTheme === 'blueprint' ? 'active' : ''}`}
              style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
              onClick={() => setMapTheme('blueprint')}
            >
              Dark GIS
            </button>
            <button
              type="button"
              className={`pill-btn ${mapTheme === 'street' ? 'active' : ''}`}
              style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
              onClick={() => setMapTheme('street')}
            >
              Street (OSM)
            </button>
          </div>
        )}
      </div>

      {/* 4. Draw-Zone Action Bar (Bottom Overlay) */}
      {mode === 'draw-zone' && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(10, 16, 23, 0.92)',
            border: '1px solid var(--line)',
            padding: '8px 14px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700' }}>Quick Shapes:</span>
            <button
              type="button"
              className="button secondary"
              style={{ height: '26px', fontSize: '10.5px', padding: '0 8px' }}
              onClick={() => applyPresetShape('rectangle')}
            >
              Rectangle
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ height: '26px', fontSize: '10.5px', padding: '0 8px' }}
              onClick={() => applyPresetShape('l_shape')}
            >
              L-Corridor
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ height: '26px', fontSize: '10.5px', padding: '0 8px' }}
              onClick={() => applyPresetShape('corridor')}
            >
              Long Corridor
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px' }}>
            <span style={{ color: '#38bdf8', fontWeight: '700' }}>
              Enclosed Area: <b>{calculatedArea} m²</b>
            </span>
            <span style={{ color: 'var(--muted)' }}>
              ({drawnPoints.length} vertices marked)
            </span>
            <button
              type="button"
              className="button secondary"
              style={{ height: '26px', fontSize: '10.5px', padding: '0 8px' }}
              onClick={() => setDrawnPoints([])}
            >
              Clear Points
            </button>
          </div>
        </div>
      )}

      {/* 5. Pick-Camera Action Bar (Facing Bearing Selector) */}
      {mode === 'pick-camera' && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(10, 16, 23, 0.94)',
            border: '1px solid var(--line)',
            padding: '8px 14px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700' }}>Camera Facing Direction:</span>
            {[
              { label: 'North ↑', angle: 180, name: 'North' },
              { label: 'East →', angle: 270, name: 'East' },
              { label: 'South ↓', angle: 0, name: 'South' },
              { label: 'West ←', angle: 90, name: 'West' }
            ].map((dir) => (
              <button
                key={dir.name}
                type="button"
                className={`button ${cameraPin.angle === dir.angle ? 'primary' : 'secondary'}`}
                style={{ height: '26px', fontSize: '10.5px', padding: '0 8px' }}
                onClick={() => setCameraPin((p) => ({ ...p, angle: dir.angle, bearing: dir.name }))}
              >
                {dir.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#00ffcc' }}>
            <span>📍 Pin Grid: <b>({cameraPin.x}%, {cameraPin.y}%)</b></span>
            <span>Bearing: <b>{cameraPin.bearing || 'South'}</b></span>
          </div>
        </div>
      )}

      {/* 6. Map Zoom & Navigation Controls */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            bottom: mode === 'view' ? '12px' : '58px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 10
          }}
        >
          <button
            type="button"
            className="cctv-ctrl-btn"
            style={{ width: '28px', height: '28px', fontSize: '12px' }}
            title="Zoom In"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
          >
            +
          </button>
          <button
            type="button"
            className="cctv-ctrl-btn"
            style={{ width: '28px', height: '28px', fontSize: '12px' }}
            title="Zoom Out"
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
          >
            -
          </button>
          <button
            type="button"
            className="cctv-ctrl-btn"
            style={{ width: '28px', height: '28px', fontSize: '11px' }}
            title="Reset Pan & Zoom"
            onClick={handleResetView}
          >
            ⛶
          </button>
        </div>
      )}
    </div>
  );
}
