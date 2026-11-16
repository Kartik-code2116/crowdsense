import { create } from 'zustand';
import { io } from 'socket.io-client';
import { apiClient } from '../api/client';
import { webcamManager } from '../services/webcamManager';

let socketInstance = null;

const demoCameras = [
  {
    id: 'CAM-01',
    name: 'Arena Concourse Gate A',
    zone: 'ARENA-CONCOURSE-01',
    zoneId: 'zone-arena-01',
    zoneName: 'Arena Main Concourse',
    count: 0,
    capacity: 0,
    maxCapacity: 350,
    status: 'Pending',
    scene: 'concourse',
    fps: 2.0,
    latencyMs: 0,
    resolution: '1920x1080',
    streamUrl: '/samples/mall_concourse.jpg',
    streamType: 'demo',
    mapPin: { x: 30, y: 35, bearing: 'South-East', angle: 135, fov: 75 }
  },
  {
    id: 'CAM-02',
    name: 'Shibuya Crossing Web Stream',
    zone: 'ARENA-CONCOURSE-01',
    zoneId: 'zone-arena-01',
    zoneName: 'Arena Main Concourse',
    count: 0,
    capacity: 0,
    maxCapacity: 350,
    status: 'Pending',
    scene: 'entrance',
    fps: 2.0,
    latencyMs: 0,
    resolution: '1920x1080',
    streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA',
    streamType: 'youtube',
    mapPin: { x: 44, y: 45, bearing: 'South', angle: 0, fov: 80 }
  },
  {
    id: 'CAM-03',
    name: 'North Bleachers Dense Array',
    zone: 'NORTH-BLEACHERS-02',
    zoneId: 'zone-bleachers-02',
    zoneName: 'North Grandstand & Bleachers',
    count: 0,
    capacity: 0,
    maxCapacity: 500,
    status: 'Pending',
    scene: 'stadium',
    fps: 2.0,
    latencyMs: 0,
    resolution: '1920x1080',
    streamUrl: '/samples/stadium_dense.jpg',
    streamType: 'demo',
    mapPin: { x: 74, y: 38, bearing: 'West', angle: 90, fov: 85 }
  }
];

const demoZones = [
  {
    id: 'zone-arena-01',
    name: 'Arena Main Concourse',
    code: 'ARENA-CONCOURSE-01',
    floor: 'Level 1 Ingress',
    currentCount: 0,
    maxCapacity: 350,
    warningPct: 70,
    criticalPct: 85,
    occupancyPct: 0,
    status: 'normal',
    egressCount: 4,
    streamUrl: '/samples/mall_concourse.jpg',
    streamType: 'demo',
    description: 'Sample workspace zone. Add a reachable camera source and assign its inference model to collect observations.',
    mapLocation: {
      lat: 35.6595,
      lng: 139.7004,
      areaSqM: 420,
      boundary: [
        { x: 12, y: 18 },
        { x: 52, y: 18 },
        { x: 52, y: 55 },
        { x: 12, y: 55 }
      ]
    }
  },
  {
    id: 'zone-bleachers-02',
    name: 'North Grandstand & Bleachers',
    code: 'NORTH-BLEACHERS-02',
    floor: 'Level 2 Seating',
    currentCount: 0,
    maxCapacity: 500,
    warningPct: 75,
    criticalPct: 90,
    occupancyPct: 0,
    status: 'normal',
    egressCount: 6,
    streamUrl: '/samples/stadium_dense.jpg',
    streamType: 'demo',
    description: 'Tiered stadium seating section characterized by high crowd density and severe head occlusion.',
    mapLocation: {
      lat: 35.6601,
      lng: 139.7010,
      areaSqM: 680,
      boundary: [
        { x: 56, y: 18 },
        { x: 92, y: 18 },
        { x: 92, y: 65 },
        { x: 56, y: 65 }
      ]
    }
  },
  {
    id: 'zone-turnstiles-03',
    name: 'South Gateway & Turnstiles',
    code: 'SOUTH-TURNSTILES-03',
    floor: 'Ground Level Ingress',
    currentCount: 0,
    maxCapacity: 250,
    warningPct: 65,
    criticalPct: 80,
    occupancyPct: 0,
    status: 'normal',
    egressCount: 3,
    streamUrl: '/samples/street_pedestrians.jpg',
    streamType: 'demo',
    description: 'Entry checkpoints and turnstile verification corridor for spectator ticket scanning.',
    mapLocation: {
      lat: 35.6590,
      lng: 139.7000,
      areaSqM: 310,
      boundary: [
        { x: 12, y: 60 },
        { x: 52, y: 60 },
        { x: 52, y: 88 },
        { x: 12, y: 88 }
      ]
    }
  }
];

const initialIncidents = [];

const initialCameras = import.meta.env.VITE_DEMO_MODE === 'true' ? demoCameras : [];
const initialZones = import.meta.env.VITE_DEMO_MODE === 'true' ? demoZones : [];
const initialNotifications = [];

const initialDetectionLog = [];
const initialLatestDetection = null;

const initialModels = [
  {
    name: 'CSRNet (Dilated Backend)',
    version: 'v1.2.0',
    type: 'Density Regression',
    partA_MAE: 68.2,
    partA_RMSE: 115.0,
    partB_MAE: 10.6,
    partB_RMSE: 16.0,
    latencyMs: null,
    parameters: 'Available when weights are loaded',
    isActive: true,
    description: 'Deploys 6 dilated convolution layers (dilation=2) to expand receptive field without pooling, preserving fine spatial resolution in highly congested crowds.'
  },
  {
    name: 'YOLOv8 Detection Baseline',
    version: 'v8.1.0',
    type: 'Object Detection (BBox)',
    partA_MAE: null,
    partA_RMSE: null,
    partB_MAE: null,
    partB_RMSE: null,
    latencyMs: null,
    parameters: 'Available when weights are loaded',
    isActive: false,
    description: 'Returns person bounding boxes where individual people are visible. Validate missed detections and duplicate boxes against labeled footage from each camera.'
  }
];

const savedDefaultModel = localStorage.getItem('crowdsense_default_model') === 'yolov8' ? 'yolov8' : 'csrnet';
initialModels.forEach((model) => { model.isActive = model.name.toLowerCase().includes(savedDefaultModel); });

export const useCrowdStore = create((set, get) => {
  // Read persisted user session from localStorage if available
  let initialUser = null;
  const rawStoredUser = localStorage.getItem('crowdsense_user');
  if (rawStoredUser) {
    try {
      initialUser = JSON.parse(rawStoredUser);
    } catch (e) {}
  }
  let initialToken = localStorage.getItem('crowdsense_token') || '';
  if (initialToken.startsWith('crowdsense-jwt-session-token-')) {
    localStorage.removeItem('crowdsense_token');
    initialToken = '';
  }
  return {
    // Authentication & Session (Single Administrator Role)
    user: initialUser,
    isAuthenticated: Boolean(initialUser && initialToken),
    token: initialToken,
    showAuthModal: false,
    showAddCameraModal: false,
    showNotificationsDrawer: false,
    showProfileMenu: false,

  // Theme & Navigation
  theme: localStorage.getItem('crowdsense-theme') || 'light',
  page: initialToken ? 'Dashboard' : 'Landing',
  range: 'Today',
  heatmap: true,
  flowVectors: false,
  sandboxSnapshot: null,

  // Live Data & Database Telemetry
  cameras: initialCameras,
  zones: initialZones,
  incidents: initialIncidents,
  notifications: initialNotifications,
  models: initialModels,
  activeCameraId: initialCameras[0]?.id || '',
  dbConnected: false,
  dbSource: 'Not connected',
  aiConnected: false,
  aiModelInfo: 'AI Service Offline',
  lastSyncTimestamp: null,

  // Real-Time Cross-Feature Synchronization
  latestDetection: initialLatestDetection,
  detectionLog: initialDetectionLog,  // Accumulated real scan results from Crowd Search & Cameras → feeds Forecast
  scannerTargetZoneId: initialZones[0]?.id || '',

  fetchLiveData: async () => {
    try {
      if (!localStorage.getItem('crowdsense_token')) return;
      const session = await apiClient.getMe();
      if (session?.success === false && session.status === 401) {
        get().logout();
        return;
      }
      if (!session?.success) {
        set({ dbConnected: false, dbSource: 'API unavailable', aiConnected: false, aiModelInfo: 'Model status unavailable' });
        return;
      }

      // 1. Fetch Cameras from Local MongoDB
      const camRes = await apiClient.getCameras();
      if (camRes?.success && Array.isArray(camRes.data)) {
        const currentZones = get().zones;
        const mapped = camRes.data.map(c => {
          const zoneObj = currentZones.find(z => z.id === c.zoneId) || { maxCapacity: 0 };
          const maxCap = zoneObj.maxCapacity || 0;
          const count = c.lastCount || 0;
          const sUrl = c.streamUrl || '';
          const sUrlLower = sUrl.toLowerCase();
          const isYt = sUrlLower.includes('youtube.com') || sUrlLower.includes('youtu.be') || c.streamType === 'youtube';
          const isWb = sUrlLower.includes('webcam') || c.streamType === 'webcam' || c.sceneType === 'webcam' || c._id === 'CAM-WEBCAM';
          const sType = c.streamType || (isYt ? 'youtube' : isWb ? 'webcam' : sUrlLower.startsWith('http') ? 'url' : 'demo');
          const lastSampleAt = c.lastActive ? new Date(c.lastActive).getTime() : 0;
          const webcamPending = isWb && (!lastSampleAt || Date.now() - lastSampleAt > 120000);

          return {
            id: c._id || c.id,
            name: c.name,
            zone: c.zoneName || 'Zone',
            zoneId: c.zoneId,
            count: count,
            capacity: maxCap > 0 ? Math.min(100, Math.round((count / maxCap) * 100)) : 0,
            maxCapacity: maxCap,
            status: webcamPending ? 'Pending' : c.status || 'Pending',
            scene: c.sceneType || (isWb ? 'webcam' : isYt ? 'youtube' : 'concourse'),
            streamType: sType,
            streamUrl: sUrl,
            fps: c.sampleFps || 2.0,
            latencyMs: c.lastLatencyMs || 0,
            lastSampleAt,
            resolution: c.resolution || '1920x1080',
            lastSnapshot: c.lastSnapshot || c.snapshotUrl || null,
            snapshotUrl: c.snapshotUrl || c.lastSnapshot || null,
            heatmapUrl: c.heatmapUrl || null,
            isWebcam: isWb,
            modelType: c.modelType || 'csrnet'
          };
        });
        set({ cameras: mapped });
      }

      // 2. Fetch Zones from Local MongoDB
      const zoneRes = await apiClient.getZones();
      if (zoneRes?.success && Array.isArray(zoneRes.data)) {
        const mappedZones = zoneRes.data.map(z => ({
          id: z._id || z.id,
          name: z.name,
          code: z.code,
          floor: z.floor || 'Ground Level',
          currentCount: z.currentCount || 0,
          maxCapacity: z.maxCapacity || 200,
          warningPct: z.warningThresholdPct || 70,
          criticalPct: z.criticalThresholdPct || 85,
          occupancyPct: z.currentOccupancyPct || Math.round(((z.currentCount || 0) / (z.maxCapacity || 200)) * 100),
          status: (z.currentOccupancyPct >= (z.criticalThresholdPct || 85)) ? 'critical' : (z.currentOccupancyPct >= (z.warningThresholdPct || 70)) ? 'warning' : 'normal',
          egressCount: z.evacuationRoutes ? z.evacuationRoutes.length : 2,
          streamUrl: z.streamUrl || '',
          streamType: z.streamType || 'url',
          description: z.description || '',
          lastSnapshot: z.lastSnapshot || null,
          heatmapUrl: z.heatmapUrl || null
        }));
        set({ zones: mappedZones });
      }

      // 3. Fetch Incidents from Local MongoDB
      const incRes = await apiClient.getIncidents();
      if (incRes?.success && Array.isArray(incRes.data)) {
        const mappedInc = incRes.data.map(i => ({
          id: i._id || i.id || i.incidentNumber,
          time: i.time || new Date(i.createdAt).toLocaleTimeString(),
          title: i.title,
          location: i.location,
          cameraId: i.cameraId,
          zoneId: i.zoneId,
          level: i.level || 'Warning',
          color: i.color || (i.level === 'Critical' ? 'red' : 'amber'),
          count: i.peakCount || 0,
          capacity: i.capacity || 200,
          occupancyPct: i.capacity ? Math.round(((i.peakCount || 0) / i.capacity) * 100) : 0,
          status: i.status || 'Open',
          notes: i.description || '',
          snapshotUrl: i.snapshotBase64 || i.snapshotUrl || null,
          snapshotBase64: i.snapshotBase64 || i.snapshotUrl || null,
          heatmapUrl: i.heatmapUrl || null
        }));
        set({ incidents: mappedInc });
      }

      // 4. Fetch Alerts from Local MongoDB
      const alertRes = await apiClient.getAlerts();
      if (alertRes?.success && Array.isArray(alertRes.data)) {
        const mappedAlerts = alertRes.data.map(a => ({
          id: a._id || a.id,
          title: a.title,
          time: new Date(a.createdAt).toLocaleTimeString(),
          unread: a.status === 'Active',
          level: a.level || 'Warning'
        }));
        set({ notifications: mappedAlerts });
      }

      // 5. Fetch Real Detections from Local MongoDB
      const auditRes = await apiClient.getAuditLogs(30);
      if (auditRes?.success && Array.isArray(auditRes.data)) {
        const mappedLog = auditRes.data.map((d) => ({
          time: d.timeStr,
          timestamp: new Date(d.timestamp).getTime(),
          count: Number(d.count) || 0,
          zoneCount: Number.isFinite(Number(d.zoneCount)) ? Number(d.zoneCount) : Number(d.count) || 0,
          zoneId: d.zoneId,
          zoneName: d.zoneName,
          cameraId: d.cameraId,
          latencyMs: d.latencyMs || 0,
          modelName: d.modelUsed || 'CSRNet',
          occupancyPct: d.occupancyPct || 0,
          capacity: d.capacity || 350,
          snapshotUrl: d.snapshotUrl || null,
          heatmapUrl: d.heatmapUrl || null,
          flow: d.flowVector ? { available: true, average_speed_px_per_frame: d.flowVector.speed, dominant_heading_deg: d.flowVector.headingDeg, flow_direction: d.flowVector.direction } : null
        }));

        const latest = mappedLog[0] || null;
        set((prev) => {
          // If cameras exist and don't yet have lastSnapshot, hydrate with latest detection frame
          const updatedCams = prev.cameras.map((c, idx) => {
            if (latest && idx === 0 && !c.lastSnapshot && latest.snapshotUrl) {
              return { ...c, lastSnapshot: latest.snapshotUrl, snapshotUrl: latest.snapshotUrl, heatmapUrl: latest.heatmapUrl };
            }
            return c;
          });

          return {
            cameras: updatedCams,
            detectionLog: [...mappedLog].reverse(),
            latestDetection: latest ? { ...latest, imageSrc: latest.snapshotUrl || null } : null
          };
        });
      }

      const backendHealth = await apiClient.getBackendHealth();
      if (backendHealth) {
        set({
          dbConnected: backendHealth.database === 'connected',
          dbSource: backendHealth.database === 'connected' ? 'MongoDB' : backendHealth.database === 'memory' ? 'Temporary in-memory storage' : 'Database unavailable'
        });
      }

      // 6. Check Health of Deep Learning Model
      const aiHealth = await apiClient.getAiHealth();
      if (aiHealth && aiHealth.status === 'online') {
        set({
          aiConnected: true,
          aiModelInfo: `${(aiHealth.available_models || []).map((model) => model.toUpperCase()).join(' · ') || 'AI ready'} (${String(aiHealth.device || 'cpu').toUpperCase()})`
        });
      } else {
        // Deep Learning model is not reachable — mark as offline
        set({ aiConnected: false, aiModelInfo: 'Model Offline' });
      }

      set({ lastSyncTimestamp: new Date().toLocaleTimeString() });
    } catch (e) {
      console.warn('Real live data fetch fallback:', e.message);
      set({ aiConnected: false, aiModelInfo: 'Model Offline', dbConnected: false });
    }
  },

  // Authentication Actions (Connecting directly to MongoDB & Node.js Gateway)
  login: async (email, password) => {
    try {
      const res = await apiClient.login(email, password);
      if (res && res.success && res.token) {
        localStorage.setItem('crowdsense_token', res.token);
        localStorage.setItem('crowdsense_user', JSON.stringify(res.user));
        if (socketInstance) {
          socketInstance.auth = { token: res.token };
          socketInstance.disconnect().connect();
        }
        set({
          user: res.user,
          isAuthenticated: true,
          token: res.token,
          showAuthModal: false,
          page: 'Dashboard'
        });
        // Immediately fetch THIS administrator's scoped data
        get().fetchLiveData();
        return { success: true };
      }
      return {
        success: false,
        message: res?.message || 'Invalid administrator credentials. Please check your email and password.'
      };
    } catch (e) {
      return { success: false, message: e.message || 'Authentication error.' };
    }
  },

  register: async (userData) => {
    try {
      const res = await apiClient.register({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        inviteCode: userData.inviteCode,
        organization: userData.organization || userData.department || 'Venue Operations Directorate'
      });
      if (res && res.success && res.token) {
        localStorage.setItem('crowdsense_token', res.token);
        localStorage.setItem('crowdsense_user', JSON.stringify(res.user));
        if (socketInstance) {
          socketInstance.auth = { token: res.token };
          socketInstance.disconnect().connect();
        }
        set({
          user: res.user,
          isAuthenticated: true,
          token: res.token,
          showAuthModal: false,
          page: 'Dashboard'
        });
        // Immediately fetch THIS new administrator's scoped starter data
        get().fetchLiveData();
        return { success: true };
      }
      return {
        success: false,
        message: res?.message || 'Administrator registration failed.'
      };
    } catch (e) {
      return { success: false, message: e.message || 'Registration error.' };
    }
  },

  logout: () => {
    localStorage.removeItem('crowdsense_token');
    localStorage.removeItem('crowdsense_user');
    if (socketInstance) socketInstance.disconnect();
    set({
      user: null,
      isAuthenticated: false,
      token: null,
      showProfileMenu: false,
      page: 'Landing'
    });
  },

  switchRole: () => {
    // Only Administrator role exists in the platform
  },

  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
  setShowAddCameraModal: (showAddCameraModal) => set({ showAddCameraModal }),
  setShowNotificationsDrawer: (showNotificationsDrawer) => set({ showNotificationsDrawer }),
  setShowProfileMenu: (showProfileMenu) => set({ showProfileMenu }),

  // Theme & Page
  setTheme: (theme) => {
    localStorage.setItem('crowdsense-theme', theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  setPage: (page) => set({ page }),
  setRange: (range) => set({ range }),
  setHeatmap: (heatmap) => set({ heatmap }),
  setFlowVectors: (flowVectors) => set({ flowVectors }),
  setActiveCameraId: (activeCameraId) => set({ activeCameraId }),
  setCameraModel: async (cameraId, modelType) => {
    const camera = get().cameras.find((item) => item.id === cameraId);
    if (!camera || !['csrnet', 'yolov8'].includes(modelType)) return { success: false, message: 'Choose a camera and supported model.' };
    const saved = await apiClient.createCamera({
      id: camera.id, name: camera.name, zoneId: camera.zoneId, zoneName: camera.zoneName,
      streamUrl: camera.streamUrl, streamType: camera.streamType, resolution: camera.resolution,
      sampleFps: camera.fps, sceneType: camera.scene, lastCount: 0, modelType
    });
    if (!saved?.success) return { success: false, message: saved?.message || 'Could not save the camera model. Check the API connection.' };
    set((state) => ({ cameras: state.cameras.map((item) => item.id === cameraId ? { ...item, modelType, count: 0, capacity: 0, status: 'Pending', latencyMs: 0, lastSampleAt: 0, lastDetection: null } : item) }));
    if (camera.id === 'CAM-WEBCAM' && webcamManager.isLiveAiActive) {
      const zone = get().zones.find((item) => item.id === camera.zoneId);
      if (zone) webcamManager.startBackgroundAiScanning(zone.id, zone.maxCapacity, modelType, zone.warningPct, zone.criticalPct);
    }
    return { success: true };
  },
  setCameraZone: async (cameraId, zoneId) => {
    const state = get();
    const camera = state.cameras.find((item) => item.id === cameraId);
    const zone = state.zones.find((item) => item.id === zoneId);
    if (!camera || !zone) return { success: false, message: 'Choose a camera and zone.' };
    const updatedCamera = {
      ...camera,
      zoneId: zone.id,
      zone: zone.code || zone.name,
      zoneName: zone.name,
      maxCapacity: zone.maxCapacity,
      capacity: Math.min(100, Math.round(((camera.count || 0) / Math.max(1, zone.maxCapacity || 1)) * 100))
    };
    const saved = await apiClient.createCamera({
      id: updatedCamera.id, name: updatedCamera.name, zoneId: updatedCamera.zoneId,
      zoneName: updatedCamera.zoneName, streamUrl: updatedCamera.streamUrl,
      streamType: updatedCamera.streamType, modelType: updatedCamera.modelType,
      resolution: updatedCamera.resolution, sampleFps: updatedCamera.fps,
      sceneType: updatedCamera.scene, lastCount: 0
    });
    if (!saved?.success) return { success: false, message: saved?.message || 'Could not save this camera assignment.' };
    const nextCamera = { ...updatedCamera, count: 0, capacity: 0, status: 'Pending', latencyMs: 0, lastSampleAt: 0, lastDetection: null };
    set((current) => ({ cameras: current.cameras.map((item) => item.id === cameraId ? nextCamera : item) }));
    if (camera.id === 'CAM-WEBCAM' && webcamManager.isLiveAiActive) {
      webcamManager.startBackgroundAiScanning(zone.id, zone.maxCapacity, camera.modelType, zone.warningPct, zone.criticalPct);
    }
    return { success: true };
  },
  setSandboxSnapshot: (sandboxSnapshot) => set({ sandboxSnapshot, page: 'Sandbox' }),

  // Camera Management (Connected to MongoDB & Live Streaming)
  addCamera: async (newCam) => {
    const state = get();
    if (!state.zones.some((zone) => zone.id === newCam.zoneId)) {
      return { success: false, message: 'Create a zone and set its capacity before adding a camera.' };
    }
    const streamUrl = newCam.streamUrl || (newCam.streamType === 'webcam' ? 'webcam' : '');
    if (!streamUrl) return { success: false, message: 'Enter a stream URL or select the laptop webcam.' };
    const urlLower = streamUrl.toLowerCase();
    const isYouTube = urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
    const isWebcam = newCam.streamType === 'webcam' || newCam.isWebcam || urlLower.includes('webcam') || newCam.scene === 'webcam';

    const streamType = newCam.streamType || (isYouTube ? 'youtube' : isWebcam ? 'webcam' : 'url');
    const scene = newCam.scene || (isWebcam ? 'webcam' : isYouTube ? 'youtube' : 'concourse');

    const targetZone = state.zones.find((z) => z.id === newCam.zoneId);
    if (!targetZone) return { success: false, message: 'Choose a configured zone before adding a camera.' };
    const maxCap = targetZone.maxCapacity || 0;
    const realCount = newCam.count !== undefined ? Number(newCam.count) : 0;
    const capPct = maxCap > 0 ? Math.min(100, Math.round((realCount / maxCap) * 100)) : 0;

    const camId = newCam.id || `CAM-${Date.now()}`;

    const newCamObj = {
      id: camId,
      name: newCam.name || (isYouTube ? 'YouTube Live Stream' : isWebcam ? 'Laptop Webcam' : 'New Camera Stream'),
      zone: newCam.zone || targetZone.code || targetZone.name || 'ZONE-01',
      zoneId: targetZone.id,
      zoneName: targetZone.name,
      count: realCount,
      capacity: capPct,
      maxCapacity: maxCap,
      status: 'Pending',
      scene: scene,
      streamUrl: streamUrl,
      streamType: streamType,
      modelType: newCam.modelType || (state.models.find((m) => m.isActive)?.name.includes('YOLO') ? 'yolov8' : 'csrnet'),
      fps: Number(newCam.fps) || (isWebcam ? 15.0 : 2.0),
      latencyMs: 0,
      resolution: newCam.resolution || (isWebcam ? '1280x720' : '1920x1080'),
      isWebcam: isWebcam,
      lastSnapshot: newCam.lastSnapshot || null,
      snapshotUrl: newCam.snapshotUrl || null,
      heatmapUrl: newCam.heatmapUrl || null,
      mapPin: newCam.mapPin || {
        x: 50,
        y: 50,
        bearing: newCam.mapPin?.bearing || 'South',
        angle: newCam.mapPin?.angle || 0,
        fov: 75
      }
    };

    // Persist first so a failed server write never appears as a connected camera.
    const saved = await apiClient.createCamera({
      id: camId,
      name: newCamObj.name,
      zoneId: targetZone.id,
      zoneName: targetZone.name,
      streamUrl: newCamObj.streamUrl,
      streamType: newCamObj.streamType,
      modelType: newCamObj.modelType,
      resolution: newCamObj.resolution,
      sampleFps: newCamObj.fps,
      sceneType: newCamObj.scene,
      lastCount: newCamObj.count
    });
    if (!saved?.success) return { success: false, message: 'Camera could not be saved. Check the API connection and try again.' };

    set({
      cameras: [...state.cameras, newCamObj],
      activeCameraId: camId,
      showAddCameraModal: false
    });

    if (isWebcam) {
      webcamManager.startBackgroundAiScanning(targetZone.id, targetZone.maxCapacity, newCamObj.modelType, targetZone.warningPct, targetZone.criticalPct);
    }
    return { success: true };
  },

  deleteCamera: async (id) => {
    const result = await apiClient.deleteCamera(id);
    if (!result?.success) return { success: false, message: result?.message || 'Could not remove this camera.' };
    if (id === 'CAM-WEBCAM') {
      webcamManager.stop();
    }
    set((state) => {
      const remaining = state.cameras.filter((c) => c.id !== id);
      return {
        cameras: remaining,
        activeCameraId: remaining[0]?.id || ''
      };
    });
    return { success: true };
  },

  toggleWebcamFeed: async () => {
    const state = get();
    const existing = state.cameras.find((c) => c.id === 'CAM-WEBCAM');
    if (existing) {
      const removed = await apiClient.deleteCamera('CAM-WEBCAM');
      if (!removed?.success) return { success: false, message: removed?.message || 'Could not remove the laptop camera.' };
      webcamManager.stop();
      const remaining = state.cameras.filter((c) => c.id !== 'CAM-WEBCAM');
      set({
        cameras: remaining,
        activeCameraId: remaining[0]?.id || ''
      });
      return { success: true };
    } else {
      const targetZone = state.zones[0];
      if (!targetZone) return { success: false, message: 'Create a zone and capacity ceiling before adding the laptop webcam.' };
      const webcamCam = {
        id: 'CAM-WEBCAM',
        name: 'Laptop Camera Feed (Live)',
        zone: targetZone.code || 'ZONE-01',
        zoneId: targetZone.id,
        zoneName: targetZone.name,
        count: 0,
        capacity: 0,
        maxCapacity: targetZone.maxCapacity || 350,
        status: 'Pending',
        scene: 'webcam',
        streamUrl: 'webcam',
        streamType: 'webcam',
        fps: 15.0,
        latencyMs: 0,
        resolution: '1280x720',
        isWebcam: true
      };

      const saved = await apiClient.createCamera({
        id: 'CAM-WEBCAM',
        name: webcamCam.name,
        zoneId: targetZone.id,
        zoneName: targetZone.name,
        streamUrl: 'webcam',
        streamType: 'webcam',
        resolution: '1280x720',
        sampleFps: 15.0,
        sceneType: 'webcam',
        lastCount: 0,
        modelType: webcamCam.modelType || 'csrnet'
      });
      if (!saved?.success) return { success: false, message: saved?.message || 'Could not register the laptop camera.' };

      webcamManager.startBackgroundAiScanning(targetZone.id, targetZone.maxCapacity, webcamCam.modelType, targetZone.warningPct, targetZone.criticalPct);

      set({
        cameras: [webcamCam, ...state.cameras],
        activeCameraId: 'CAM-WEBCAM'
      });
      return { success: true };
    }
  },

  setScannerTargetZoneId: (scannerTargetZoneId) => set({ scannerTargetZoneId }),

  inspectInCrowdSearch: (imageSrc, zoneId) => {
    const defaultZoneId = get().zones[0]?.id || '';
    set({
      sandboxSnapshot: imageSrc,
      scannerTargetZoneId: zoneId || defaultZoneId,
      page: 'Crowd search'
    });
  },

  // Central Real Detection Dispatcher - connects Crowd Search & Cameras to Dashboard, Live Monitor, Analytics & Incidents
  recordRealDetection: (payload) => {
    const state = get();
    const count = Number(payload.count) || 0;
    const latencyMs = Number(payload.latencyMs) || 0;
    const targetZoneId = payload.zoneId || state.scannerTargetZoneId;
    const targetZone = state.zones.find((z) => z.id === targetZoneId);
    const targetCameraId = payload.cameraId || (state.cameras.some((c) => c.id === 'CAM-WEBCAM') ? 'CAM-WEBCAM' : state.cameras[0]?.id);
    const selectedCamera = state.cameras.find((camera) => camera.id === targetCameraId);
    // One-shot uploaded/sample image scans are not live venue observations.
    if (!targetZone || !selectedCamera || selectedCamera.zoneId !== targetZoneId) return;
    const realFrame = payload.imageSrc || payload.snapshotUrl || null;
    const heatmapFrame = payload.heatmapUrl || null;

    // 1. Update Camera in State with real capture frame
    const observedAt = Date.now();
    const updatedCameras = state.cameras.map((c) => {
      if (c.id === targetCameraId || (payload.isWebcam && c.id === 'CAM-WEBCAM')) {
        const cap = Math.min(100, Math.round((count / (targetZone.maxCapacity || 200)) * 100));
        return {
          ...c,
          count,
          capacity: cap,
          maxCapacity: targetZone.maxCapacity || c.maxCapacity,
          latencyMs,
          lastSampleAt: observedAt,
          status: 'Live',
          resolution: payload.resolution ? `${payload.resolution.width}x${payload.resolution.height}` : c.resolution,
          lastDetection: payload,
          lastSnapshot: realFrame || c.lastSnapshot,
          snapshotUrl: realFrame || c.snapshotUrl,
          heatmapUrl: heatmapFrame || c.heatmapUrl
        };
      }
      return c;
    });
    const hasTargetCamera = state.cameras.some((camera) => camera.id === targetCameraId && camera.zoneId === targetZoneId);
    const camerasInZone = updatedCameras.filter((camera) => camera.zoneId === targetZoneId && observedAt - (Number(camera.lastSampleAt) || 0) < 120000);
    const zoneCount = hasTargetCamera ? camerasInZone.reduce((sum, camera) => sum + (Number(camera.count) || 0), 0) : count;
    const zoneCapacity = Math.max(1, Number(targetZone.maxCapacity) || 1);
    const zoneOccupancyPct = Math.round((zoneCount / zoneCapacity) * 100);

    // 2. Update Zone in State
    const updatedZones = state.zones.map((z) => {
      if (z.id === targetZoneId) {
        const occPct = zoneOccupancyPct;
        const status = occPct >= z.criticalPct ? 'critical' : occPct >= z.warningPct ? 'warning' : 'normal';
        return {
          ...z,
          currentCount: zoneCount,
          occupancyPct: occPct,
          status,
          lastSnapshot: realFrame || z.lastSnapshot,
          heatmapUrl: heatmapFrame || z.heatmapUrl
        };
      }
      return z;
    });

    // Append this observed camera detection to the live-session history.
    const detectionEntry = {
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      count,
      zoneCount,
      zoneId: targetZoneId,
      zoneName: targetZone.name,
      cameraId: targetCameraId,
      latencyMs,
      modelName: payload.modelName || 'CSRNet',
      flow: payload.flow || null,
      occupancyPct: zoneOccupancyPct,
      capacity: targetZone.maxCapacity,
      snapshotUrl: realFrame,
      heatmapUrl: heatmapFrame
    };
    const prevLog = get().detectionLog || [];
    const updatedLog = [...prevLog, detectionEntry].slice(-50); // keep last 50 scans

    set({
      cameras: updatedCameras,
      zones: updatedZones,
      detectionLog: updatedLog,
      latestDetection: {
        ...payload,
        zoneName: targetZone.name,
        timestamp: new Date().toLocaleTimeString(),
        imageSrc: realFrame,
        heatmapUrl: heatmapFrame
      },
      lastSyncTimestamp: new Date().toLocaleTimeString()
    });

    // 6. Asynchronously persist real detection and frame snapshot to local MongoDB (27017)
    apiClient.saveDetection({
      cameraId: targetCameraId,
      zoneId: targetZoneId,
      zoneName: targetZone.name,
      count,
      zoneCount,
      occupancyPct: zoneOccupancyPct,
      latencyMs,
      modelUsed: payload.modelName || 'CSRNet',
      flowVector: payload.flow || null,
      peakDensity: Number(payload.peakDensity) || 0,
      snapshotUrl: null,
      heatmapUrl: null,
      source: payload.isWebcam ? 'webcam' : payload.source || 'scanner'
    }).catch((e) => console.warn('Persist to Mongo deferred:', e.message));
  },

  // Zone Management Actions
  addZone: async (newZone) => {
    const id = newZone.id || `zone_${Date.now()}`;
    const zoneObj = {
      id,
      name: newZone.name || 'New Safety Zone',
      code: newZone.code || `ZONE-0${get().zones.length + 1}`,
      floor: newZone.floor || 'Ground Level',
      currentCount: 0,
      maxCapacity: Number(newZone.maxCapacity) || 200,
      warningPct: Number(newZone.warningPct) || 70,
      criticalPct: Number(newZone.criticalPct) || 85,
      occupancyPct: 0,
      status: 'normal',
      egressCount: Number(newZone.egressCount) || 2,
      streamUrl: newZone.streamUrl || '',
      streamType: newZone.streamType || 'url',
      description: newZone.description || 'Configured monitoring safety zone.',
      mapLocation: newZone.mapLocation || {
        lat: 35.6595,
        lng: 139.7004,
        areaSqM: newZone.areaSqM || 350,
        boundary: newZone.boundary || [
          { x: 20, y: 25 },
          { x: 60, y: 25 },
          { x: 60, y: 65 },
          { x: 20, y: 65 }
        ]
      }
    };

    try {
      const saved = await apiClient.createZone({
        id,
        name: zoneObj.name,
        code: zoneObj.code,
        floor: zoneObj.floor,
        maxCapacity: zoneObj.maxCapacity,
        warningThresholdPct: zoneObj.warningPct,
        criticalThresholdPct: zoneObj.criticalPct,
        evacuationRoutes: ['Main Egress Door', 'Emergency Exit'],
        streamUrl: zoneObj.streamUrl,
        streamType: zoneObj.streamType,
        description: zoneObj.description
      });
      if (!saved?.success) return { success: false, message: saved?.message || 'Could not create this zone.' };
      set((state) => ({ zones: [...state.zones, zoneObj] }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message || 'Could not create this zone.' };
    }
  },

  deleteZone: async (zoneId) => {
    try {
      const result = await apiClient.deleteZone(zoneId);
      if (!result?.success) return { success: false, message: result?.message || 'Could not delete this zone.' };
      set((state) => ({ zones: state.zones.filter((z) => z.id !== zoneId) }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message || 'Could not delete this zone.' };
    }
  },

  updateZone: async (zoneId, updates) => {
    try {
      const { warningPct, criticalPct, ...zoneFields } = updates;
      const result = await apiClient.updateZone(zoneId, {
        ...zoneFields,
        ...(warningPct !== undefined ? { warningThresholdPct: Number(warningPct) } : {}),
        ...(criticalPct !== undefined ? { criticalThresholdPct: Number(criticalPct) } : {})
      });
      if (!result?.success) return { success: false, message: result?.message || 'Could not save this zone.' };
      set((state) => ({ zones: state.zones.map((z) => {
        if (z.id !== zoneId) return z;
        const updated = { ...z, ...updates };
        const cap = Number(updated.maxCapacity) || 1;
        const occ = Math.round((Number(updated.currentCount) || 0) / cap * 100);
        const status = occ >= updated.criticalPct ? 'critical' : occ >= updated.warningPct ? 'warning' : 'normal';
        return { ...updated, occupancyPct: occ, status };
      }) }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message || 'Could not save this zone.' };
    }
  },

  // Zone Thresholds
  updateZoneThresholds: async (zoneId, warningPct, criticalPct) => {
    const zone = get().zones.find((item) => item.id === zoneId);
    if (!zone) return { success: false, message: 'Zone not found.' };
    return get().updateZone(zoneId, {
      ...zone,
      warningPct: Number(warningPct),
      criticalPct: Number(criticalPct)
    });
  },

  // Incident Actions
  resolveIncident: async (id) => {
    const result = await apiClient.resolveIncident(id);
    if (!result?.success) return { success: false, message: result?.message || 'Could not resolve this incident.' };
    set((state) => ({ incidents: state.incidents.map((inc) => inc.id === id ? { ...inc, status: 'Resolved', level: 'Resolved', color: 'green' } : inc) }));
    return { success: true };
  },

  addIncidentNote: (id, note) => set((state) => ({
    incidents: state.incidents.map((inc) =>
      inc.id === id ? { ...inc, notes: `${inc.notes || ''} [${new Date().toLocaleTimeString()}]: ${note}` } : inc
    )
  })),

  // Notifications
  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, unread: false }))
  })),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),

  // Models
  setActiveModel: (modelName) => {
    const modelType = modelName.toLowerCase().includes('yolo') ? 'yolov8' : 'csrnet';
    localStorage.setItem('crowdsense_default_model', modelType);
    set((state) => ({ models: state.models.map((model) => ({ ...model, isActive: model.name.toLowerCase().includes(modelType) })) }));
    return { success: true };
  }
  };
});

// Real-Time Socket.io Live Telemetry Listener
try {
  socketInstance = io({ path: '/socket.io', transports: ['websocket', 'polling'],
    auth: (callback) => callback({ token: localStorage.getItem('crowdsense_token') || '' }),
    reconnectionAttempts: 10
  });

  socketInstance.on('telemetry:tick', (tick) => {
    if (tick && tick.cameras && Array.isArray(tick.cameras)) {
      useCrowdStore.setState((state) => {
        const updatedCameras = state.cameras.map((c) => {
          const match = tick.cameras.find((tc) => tc.id === c.id || tc.id === c._id);
          if (match) {
            const count = match.count;
            const cap = Math.min(100, Math.round((count / (c.maxCapacity || 200)) * 100));
            const lastSampleAt = match.lastActive ? new Date(match.lastActive).getTime() : 0;
            const webcamPending = c.isWebcam && (!lastSampleAt || Date.now() - lastSampleAt > 120000);
            return {
              ...c,
              count,
              capacity: cap,
              latencyMs: match.latencyMs ?? c.latencyMs,
              lastSampleAt: match.lastActive ? lastSampleAt : c.lastSampleAt,
              status: webcamPending ? 'Pending' : match.status || c.status
            };
          }
          return c;
        });

        const updatedZones = state.zones.map((z) => {
          const serverZone = tick.zones?.find((item) => item.id === z.id);
          if (serverZone) {
            const zoneCount = Number(serverZone.currentCount) || 0;
            const occ = Number(serverZone.occupancyPct) || Math.round((zoneCount / Math.max(1, z.maxCapacity || 1)) * 100);
            const status = occ >= z.criticalPct ? 'critical' : occ >= z.warningPct ? 'warning' : 'normal';
            return { ...z, currentCount: zoneCount, occupancyPct: occ, status };
          }
          const zoneCams = updatedCameras.filter((c) => c.zoneId === z.id && c.status === 'Live');
          const zoneCount = zoneCams.reduce((sum, c) => sum + c.count, 0);
          const occ = Math.round((zoneCount / Math.max(1, z.maxCapacity || 1)) * 100);
          const status = occ >= z.criticalPct ? 'critical' : occ >= z.warningPct ? 'warning' : 'normal';
          return {
            ...z,
            currentCount: zoneCount,
            occupancyPct: occ,
            status
          };
        });

        return {
          cameras: updatedCameras,
          zones: updatedZones,
          dbConnected: tick.source === 'Local-MongoDB',
          dbSource: tick.source === 'Local-MongoDB' ? 'MongoDB' : 'Temporary in-memory storage',
          lastSyncTimestamp: tick.timestamp || new Date().toLocaleTimeString()
        };
      });
    }
  });

  socketInstance.on('alert:created', (alert) => {
    useCrowdStore.setState((state) => ({
      notifications: [
        {
          id: alert._id || `notif_${Date.now()}`,
          title: alert.title,
          time: new Date().toLocaleTimeString(),
          unread: true,
          level: alert.level || 'Warning'
        },
        ...state.notifications
      ]
    }));
  });
} catch (e) {
  console.warn('Socket.io listener init:', e.message);
}

// Register global webcam background detection dispatcher
try {
  webcamManager.setStoreDispatch((payload) => {
    useCrowdStore.getState().recordRealDetection(payload);
  });
} catch (e) {}
