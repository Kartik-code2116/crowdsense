import React, { useEffect, useRef, useState } from 'react';
import { webcamManager } from '../services/webcamManager';
import { useCrowdStore } from '../store/useCrowdStore';

/**
 * Helper to extract YouTube Video/Live Stream ID from any format:
 * - https://www.youtube.com/watch?v=1-iS7LArMPA
 * - https://youtu.be/1-iS7LArMPA
 * - https://www.youtube.com/live/1-iS7LArMPA
 * - https://www.youtube.com/embed/1-iS7LArMPA
 */
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?.*v=|live\/|shorts\/))([\w-]{11})/);
  if (match) return match[1];
  const simple = trimmed.match(/(?:v=|\/)([\w-]{11})(?:[&?]|$)/);
  if (simple) return simple[1];
  return null;
}

function getPublicEmbed(url) {
  if (!url) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const youtubeId = extractYouTubeId(url);
  if (youtubeId && (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com'))) {
    return { provider: 'YouTube', src: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&playsinline=1` };
  }
  if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) {
    const videoId = parsed.pathname.match(/^\/videos\/(\d+)/)?.[1];
    const channel = parsed.pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/)?.[1];
    if (!videoId && !channel) return null;
    const params = new URLSearchParams({ parent: window.location.hostname, muted: 'true', autoplay: 'false' });
    if (videoId) params.set('video', `v${videoId}`);
    else params.set('channel', channel);
    return { provider: 'Twitch', src: `https://player.twitch.tv/?${params}` };
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const id = parsed.pathname.match(/(?:^|\/)(\d+)(?:$|\/)/)?.[1];
    if (id) return { provider: 'Vimeo', src: `https://player.vimeo.com/video/${id}?autoplay=0&muted=1` };
  }
  if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com') || host === 'dai.ly') {
    const id = parsed.pathname.match(/(?:video\/|^\/)([a-zA-Z0-9]+)/)?.[1];
    if (id) return { provider: 'Dailymotion', src: `https://www.dailymotion.com/embed/video/${id}?autoplay=0&mute=1` };
  }
  return null;
}

/**
 * Enterprise CCTV Camera Player with Multi-Source Ingestion:
 * Shows browser-accessible video, permitted public provider embeds, webcam
 * frames, saved snapshots, AI heatmaps, and measured motion vectors. RTSP links
 * need a browser-ready gateway to preview; server-side sampling may still read them.
 */
export default function CCTVCanvasStream({
  cameraId = 'CAM-01',
  cameraName = 'Central Concourse',
  count = 0,
  resolution = '1920x1080',
  fps = 2.0,
  latencyMs = 0,
  heatmap = true,
  flowVectors = false,
  sceneType = 'concourse',
  streamType = null,
  interactive = true,
  height = 180,
  streamUrl = null,
  snapshotUrl = null,
  lastSnapshot = null,
  heatmapUrl = null,
  onSnapshot = null,
  onCountChange = null,
  zoneId = null,
  cameraStatus = 'Pending',
  modelType = 'csrnet'
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [liveCount, setLiveCount] = useState(count ?? null);

  // Pull aiConnected from store — determines whether detection is active
  const { aiConnected, cameras: storeCameras } = useCrowdStore();
  const cameraFlow = storeCameras.find((camera) => camera.id === cameraId)?.lastDetection?.flow;
  const motionVectors = cameraFlow?.available ? cameraFlow.vectors || [] : [];

  // Detect Stream Kind
  const embed = getPublicEmbed(streamUrl);
  const isPublicEmbed = Boolean(embed);
  const isWebcam = streamType === 'webcam' || sceneType === 'webcam' || cameraId === 'CAM-WEBCAM' || (streamUrl && streamUrl.toLowerCase().includes('webcam'));
  const isDirectVideo = Boolean(streamUrl && /\.(mp4|webm|m3u8)(?:$|[?#])/i.test(streamUrl));
  const imageUrl = /\.(jpe?g|png|webp|bmp)(?:$|[?#])/i.test(streamUrl || '');
  const realCapture = snapshotUrl || lastSnapshot || (imageUrl ? streamUrl : null);
  const photoSrc = realCapture || '';
  const heatmapSrc = heatmapUrl || '';

  const imgRef = useRef(null);
  const heatmapImgRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Sync count when external prop updates (from real AI detections)
  useEffect(() => {
    if (count !== undefined) {
      setLiveCount(count);
    }
  }, [count]);

  // Stream Initialization (Webcam, Direct Video, or Images)
  useEffect(() => {
    if (isWebcam) {
      const vid = document.createElement('video');
      vid.autoplay = true;
      vid.muted = true;
      vid.playsInline = true;
      videoRef.current = vid;

      webcamManager.attachToVideo(vid)
        .then((stream) => {
          mediaStreamRef.current = stream;
        })
        .catch((e) => {
          if (e.name !== 'AbortError' && !e.message?.includes('interrupted')) {
            console.warn('CCTV Webcam stream notice:', e.message);
          }
        });

      return () => {
        mediaStreamRef.current = null;
      };
    } else if (isDirectVideo) {
      const vid = document.createElement('video');
      vid.autoplay = true;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.crossOrigin = 'anonymous';
      vid.src = streamUrl;
      videoRef.current = vid;
      vid.play().catch(() => {});
    } else if (!isPublicEmbed) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoSrc;
      img.onload = () => {
        imgRef.current = img;
      };

      const heatImg = new Image();
      heatImg.crossOrigin = 'anonymous';
      heatImg.src = heatmapSrc;
      heatImg.onload = () => {
        heatmapImgRef.current = heatImg;
      };
    }
  }, [photoSrc, heatmapSrc, sceneType, cameraId, isWebcam, isPublicEmbed, isDirectVideo, streamUrl]);

  // NOTE: The fake crowd count simulation that previously existed here for YouTube/video streams
  // has been REMOVED. No synthetic detections are generated when AI service is offline.
  // Real counts only come from the AI service (localhost:8000) via recordRealDetection.

  // Canvas Render Loop (Overlays, OSD, Heatmaps, Vectors)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      if (zoomLevel > 1) {
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-w / 2, -h / 2);
      }

      // 1. Draw Video or Background Image if not YouTube
      if (!isPublicEmbed) {
        if ((isWebcam || isDirectVideo) && videoRef.current && videoRef.current.readyState >= 2) {
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          ctx.fillStyle = 'rgba(10, 25, 40, 0.08)';
          ctx.fillRect(0, 0, w, h);

        } else if (imgRef.current && imgRef.current.complete) {
          ctx.drawImage(imgRef.current, 0, 0, w, h);
          ctx.fillStyle = 'rgba(10, 25, 40, 0.15)';
          ctx.fillRect(0, 0, w, h);
        } else {
          // Fallback dark gradient
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, '#1c2631');
          grad.addColorStop(1, '#111820');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // 2. Draw only a heatmap returned by the selected inference model.
      if (heatmap && heatmapUrl && heatmapImgRef.current?.complete) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(heatmapImgRef.current, 0, 0, w, h);
        ctx.restore();
      }

      // 3. Farneback Optical Flow Motion Vectors (only when AI is connected)
      if (flowVectors && aiConnected) {
        ctx.strokeStyle = '#00ffcc';
        ctx.fillStyle = '#00ffcc';
        ctx.lineWidth = 1.5;

        motionVectors.forEach((v) => {
          const x = ((v.grid_x + 0.5) / 4) * w;
          const y = ((v.grid_y + 0.5) / 4) * h;
          const vx = v.dx;
          const vy = v.dy;
          const arrowLen = 14;
          const magnitude = Math.max(0.001, Math.hypot(vx, vy));
          const targetX = x + (vx / magnitude) * arrowLen;
          const targetY = y + (vy / magnitude) * arrowLen;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(vy, vx);
          ctx.beginPath();
          ctx.moveTo(targetX, targetY);
          ctx.lineTo(targetX - 4 * Math.cos(angle - Math.PI / 6), targetY - 4 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(targetX - 4 * Math.cos(angle + Math.PI / 6), targetY - 4 * Math.sin(angle + Math.PI / 6));
          ctx.fill();
        });
      }

      ctx.restore();

      // 4. Source and last-known inference status. No synthetic timecode or REC indicator.
      const streamTag = embed?.provider.toUpperCase() || (isWebcam ? 'LAPTOP WEBCAM' : isDirectVideo ? 'NETWORK VIDEO' : realCapture ? 'SAVED FRAME' : 'NO PREVIEW');
      ctx.fillStyle = 'rgba(10, 18, 25, 0.82)';
      ctx.fillRect(8, 8, 185, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.fillText(`${cameraId} · ${streamTag}`, 14, 21);

      // Bottom Left: AI Status / CSRNet Density Telemetry HUD
      ctx.fillStyle = 'rgba(10, 18, 25, 0.88)';
      ctx.fillRect(8, h - 26, Math.min(w - 16, 330), 20);
      ctx.fillStyle = cameraStatus === 'Live' && aiConnected ? '#00ffcc' : '#f0b553';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      const statusText = cameraStatus === 'Live' && aiConnected && liveCount !== null
        ? `${String(modelType).toUpperCase()} · LAST SAMPLE ${liveCount} PEOPLE${Number(latencyMs) > 0 ? ` · ${latencyMs}MS` : ''}`
        : `${String(cameraStatus || 'Pending').toUpperCase()} · ${aiConnected ? 'WAITING FOR SAMPLE' : 'AI UNAVAILABLE'}`;
      ctx.fillText(statusText.slice(0, 56), 14, h - 13);

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, zoomLevel, heatmap, heatmapUrl, flowVectors, latencyMs, fps, liveCount, cameraId, isPublicEmbed, embed?.provider, isWebcam, isDirectVideo, aiConnected, motionVectors, cameraStatus, modelType]);

  const handleSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || isPublicEmbed) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    if (onSnapshot) {
      onSnapshot(dataUrl);
    } else {
      const link = document.createElement('a');
      link.download = `${cameraId}_snapshot_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div
      className="cctv-canvas-player"
      style={{
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        background: '#0a1017',
        borderRadius: '6px'
      }}
    >
      {/* Public provider embeds show video only; inference is performed by the server-side sampler. */}
      {isPublicEmbed && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <iframe
            src={embed.src}
            title={`${cameraName} · ${embed.provider} player`}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '128%',
              height: '128%',
              transform: 'translate(-50%, -50%)',
              border: 'none',
              pointerEvents: 'auto'
            }}
          />
        </div>
      )}

      {/* 2. Real Canvas Video Stream & Live Detection Overlays */}
      <canvas
        ref={canvasRef}
        width={480}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          pointerEvents: isPublicEmbed ? 'none' : 'auto'
        }}
      />

      {/* 3. Interactive Stream Control Buttons */}
      {interactive && (
        <div className="cctv-player-controls">
          <button
            className="cctv-ctrl-btn"
            title={isPublicEmbed ? 'Use the provider playback controls' : isPlaying ? 'Pause Feed' : 'Resume Feed'}
            disabled={isPublicEmbed}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="cctv-ctrl-btn"
            title={isPublicEmbed ? 'Provider video cannot be captured by the browser; use server inference results' : 'Capture frame and send to scanner'}
            disabled={isPublicEmbed}
            onClick={handleSnapshot}
          >
            📷
          </button>
          <button
            className="cctv-ctrl-btn"
            title={isPublicEmbed ? 'Use the provider playback controls' : 'Toggle Digital Zoom'}
            disabled={isPublicEmbed}
            onClick={() => setZoomLevel(zoomLevel === 1 ? 1.5 : 1)}
          >
            🔍 {zoomLevel > 1 ? '1×' : '1.5×'}
          </button>
        </div>
      )}
    </div>
  );
}
