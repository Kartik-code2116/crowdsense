/**
 * Enterprise Persistent Webcam Stream & Live AI Manager
 * Maintains a persistent, shared hardware MediaStream across page transitions,
 * preventing 'The play() request was interrupted by a new load request' AbortErrors
 * and ensuring edge camera streams continue running smoothly in the background.
 */
import { apiClient } from '../api/client';

class WebcamManager {
  constructor() {
    this.stream = null;
    this.activeDeviceId = null;
    this.isLiveAiActive = false;
    this.liveIntervalId = null;
    this.targetZoneId = 'zone-arena-01';
    this.targetCapacity = 350;
    this.modelType = 'yolov8';
    this.storeDispatch = null;
    this.listeners = new Set();
  }

  setStoreDispatch(dispatchFn) {
    this.storeDispatch = dispatchFn;
  }

  isLive() {
    if (!this.stream) return false;
    const tracks = this.stream.getVideoTracks();
    return tracks.length > 0 && tracks.some((t) => t.readyState === 'live');
  }

  async getStream(deviceId = null) {
    // If an existing stream with live tracks is already active for this device, reuse it
    if (this.isLive() && (!deviceId || this.activeDeviceId === deviceId)) {
      return this.stream;
    }

    // If changing devices, cleanly stop old tracks first
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } }
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = newStream;
      this.activeDeviceId = deviceId;
      this.notifyListeners({ status: 'connected', stream: newStream });
      return newStream;
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
        // Return existing stream if interrupted
        if (this.isLive()) return this.stream;
      }
      throw err;
    }
  }

  async attachToVideo(videoElement, deviceId = null) {
    if (!videoElement) return null;
    const mediaStream = await this.getStream(deviceId);

    try {
      if (videoElement.srcObject !== mediaStream) {
        videoElement.srcObject = mediaStream;
      }
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {
      // AbortError is benign when elements attach/detach during page route changes
      if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
        return mediaStream;
      }
      throw err;
    }

    return mediaStream;
  }

  stop(force = true) {
    if (this.liveIntervalId) {
      clearInterval(this.liveIntervalId);
      this.liveIntervalId = null;
    }
    this.isLiveAiActive = false;

    if (force && this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      this.activeDeviceId = null;
    }

    this.notifyListeners({ status: 'stopped' });
  }

  startBackgroundAiScanning(zoneId = 'zone-arena-01', capacity = 350, model = 'yolov8') {
    this.targetZoneId = zoneId;
    this.targetCapacity = capacity;
    this.modelType = model;
    this.isLiveAiActive = true;

    if (this.liveIntervalId) {
      clearInterval(this.liveIntervalId);
    }

    this.executeSingleAiTick();
    this.liveIntervalId = setInterval(() => {
      this.executeSingleAiTick();
    }, 2000); // 2-second background inference interval
  }

  stopBackgroundAiScanning() {
    this.isLiveAiActive = false;
    if (this.liveIntervalId) {
      clearInterval(this.liveIntervalId);
      this.liveIntervalId = null;
    }
  }

  async executeSingleAiTick() {
    if (!this.isLive()) return;
    try {
      const track = this.stream?.getVideoTracks()[0];
      if (!track || track.readyState !== 'live') return;

      // Capture frame using ImageCapture or OffscreenCanvas
      let blob = null;
      let width = 640;
      let height = 480;

      if ('ImageCapture' in window) {
        try {
          const imageCapture = new window.ImageCapture(track);
          const frameBitmap = await imageCapture.grabFrame();
          width = frameBitmap.width;
          height = frameBitmap.height;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(frameBitmap, 0, 0);
          blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
        } catch (e) {
          // Fallback to hidden video if ImageCapture not supported
        }
      }

      if (!blob) {
        const offscreenVideo = document.createElement('video');
        offscreenVideo.muted = true;
        offscreenVideo.playsInline = true;
        offscreenVideo.srcObject = this.stream;
        await offscreenVideo.play().catch(() => {});
        width = offscreenVideo.videoWidth || 640;
        height = offscreenVideo.videoHeight || 480;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(offscreenVideo, 0, 0);
        blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
      }

      if (blob && this.storeDispatch) {
        // Read blob as Data URL to store real capture frame in MongoDB & UI components
        const frameDataUrl = await new Promise((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.readAsDataURL(blob);
        });

        const result = await apiClient.predictImage(blob, this.modelType, this.targetCapacity);
        if (result) {
          const count = result.count !== undefined ? result.count : (result.detected_boxes?.length || 1);
          this.storeDispatch({
            count,
            boxes: result.detected_boxes || [],
            heads: result.detected_heads || [],
            heatmapUrl: result.heatmap_data_url || null,
            latencyMs: result.latency_ms || 34.0,
            resolution: { width, height },
            zoneId: this.targetZoneId,
            modelName: this.modelType,
            imageSrc: frameDataUrl,
            isWebcam: true
          });
        }
      }
    } catch (e) {
      // Continue safely
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(data) {
    this.listeners.forEach((fn) => fn(data));
  }
}

export const webcamManager = new WebcamManager();
