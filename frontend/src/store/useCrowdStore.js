import { create } from 'zustand';
import { io } from 'socket.io-client';
import { apiClient } from '../api/client';
import { webcamManager } from '../services/webcamManager';

const defaultUsers = {
  admin: {
    id: 'usr_admin',
    name: 'Alex Kumar',
    email: 'admin@crowdsense.io',
    role: 'admin',
    avatar: 'AK',
    department: 'Venue Operations Lead',
    permissions: ['all', 'manage_cameras', 'manage_zones', 'switch_models', 'resolve_incidents']
  },
  operator: {
    id: 'usr_operator',
    name: 'Sarah Jenkins',
    email: 'operator@crowdsense.io',
    role: 'operator',
    avatar: 'SJ',
    department: 'Control Room Shift 02',
    permissions: ['monitor', 'acknowledge_alerts', 'resolve_incidents']
  },
  analyst: {
    id: 'usr_analyst',
    name: 'David Chen',
    email: 'analyst@crowdsense.io',
    role: 'analyst',
    avatar: 'DC',
    department: 'Safety Compliance Analyst',
    permissions: ['view_analytics', 'export_reports']
  },
  viewer: {
    id: 'usr_viewer',
    name: 'Elena Rostova',
    email: 'viewer@crowdsense.io',
    role: 'viewer',
    avatar: 'ER',
    department: 'Executive Board',
    permissions: ['view_only']
  }
};

const initialCameras = [
  { id: 'CAM-01', name: 'Arena Concourse Gate A', zone: 'ARENA-CONCOURSE-01', zoneId: 'zone-arena-01', count: 0, capacity: 0, maxCapacity: 350, status: 'Live', scene: 'concourse', fps: 2.0, latencyMs: 38, resolution: '1920x1080', streamUrl: '/samples/mall_concourse.jpg' }
];

const initialZones = [
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
    description: 'Primary spectator concourse and ingress corridor. Continuously monitored with CSRNet density regression and YOLOv8 spatial tracking.'
  }
];

const initialIncidents = [];

const initialNotifications = [
  { id: 'notif_init', title: 'System Online: All safety zones active and monitoring edge streams', time: new Date().toLocaleTimeString(), unread: false, level: 'Info' }
];

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
    latencyMs: 38.4,
    parameters: '16.2M',
    isActive: true,
    description: 'Deploys 6 dilated convolution layers (dilation=2) to expand receptive field without pooling, preserving fine spatial resolution in highly congested crowds.'
  },
  {
    name: 'MCNN (Multi-Column)',
    version: 'v1.0.1',
    type: 'Density Regression',
    partA_MAE: 110.2,
    partA_RMSE: 173.2,
    partB_MAE: 26.4,
    partB_RMSE: 41.3,
    latencyMs: 18.2,
    parameters: '0.13M',
    isActive: false,
    description: 'Uses 3 parallel CNN branches with large (9x9), medium (7x7), and small (5x5) kernels to handle varying head scale changes across camera angles.'
  },
  {
    name: 'YOLOv8 Detection Baseline',
    version: 'v8.1.0',
    type: 'Object Detection (BBox)',
    partA_MAE: 234.8,
    partA_RMSE: 312.4,
    partB_MAE: 38.5,
    partB_RMSE: 54.1,
    latencyMs: 44.0,
    parameters: '25.9M',
    isActive: false,
    description: 'Object detection baseline. Suffers severe recall degradation in congested Part A (>80% head overlap) due to NMS suppression and scale limits.'
  }
];

export const useCrowdStore = create((set, get) => ({
  // Authentication & Session
  user: defaultUsers.admin,
  isAuthenticated: true,
  token: 'crowdsense-jwt-session-token-admin',
  showAuthModal: false,
  showAddCameraModal: false,
  showNotificationsDrawer: false,
  showProfileMenu: false,

  // Theme & Navigation
  theme: localStorage.getItem('crowdsense-theme') || 'light',
  page: 'Dashboard',
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
  activeCameraId: 'CAM-01',
  dbConnected: false,
  dbSource: 'Not connected',
  aiConnected: false,
  aiModelInfo: 'AI Service Offline',
  lastSyncTimestamp: null,

  // Real-Time Cross-Feature Synchronization
  latestDetection: initialLatestDetection,
  detectionLog: initialDetectionLog,  // Accumulated real scan results from Crowd Search & Cameras → feeds Forecast
  scannerTargetZoneId: 'zone-arena-01',
  analyticsHistory: [],

  fetchLiveData: async () => {
    try {
      // 1. Fetch Cameras from Local MongoDB
      const camRes = await apiClient.getCameras();
      if (camRes && camRes.data && Array.isArray(camRes.data) && camRes.data.length > 0) {
        const currentZones = get().zones;
        const mapped = camRes.data.map(c => {
          const zoneObj = currentZones.find(z => z.id === c.zoneId) || { maxCapacity: 200 };
          const maxCap = zoneObj.maxCapacity || 200;
          const count = c.lastCount || 0;
          return {
            id: c._id || c.id,
            name: c.name,
            zone: c.zoneName || 'Zone',
            zoneId: c.zoneId,
            count: count,
            capacity: Math.min(100, Math.round((count / maxCap) * 100)),
            maxCapacity: maxCap,
            status: c.status || 'Live',
            scene: c.sceneType || 'concourse',
            fps: c.sampleFps || 2.0,
            latencyMs: c.lastLatencyMs || 38,
            resolution: c.resolution || '1920x1080',
            streamUrl: c.streamUrl || '',
            lastSnapshot: c.lastSnapshot || c.snapshotUrl || null,
            snapshotUrl: c.snapshotUrl || c.lastSnapshot || null,
            heatmapUrl: c.heatmapUrl || null
          };
        });
        set({ cameras: mapped, dbConnected: true, dbSource: 'MongoDB Local (27017)' });
      } else {
        // Backend not reachable — keep static cameras but mark db as offline
        set({ dbConnected: false, dbSource: 'Not connected' });
      }

      // 2. Fetch Zones from Local MongoDB
      const zoneRes = await apiClient.getZones();
      if (zoneRes && zoneRes.data && Array.isArray(zoneRes.data) && zoneRes.data.length > 0) {
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
      if (incRes && incRes.data && Array.isArray(incRes.data) && incRes.data.length > 0) {
        const mappedInc = incRes.data.map(i => ({
          id: i._id || i.id || i.incidentNumber,
          time: i.time || new Date(i.createdAt).toLocaleTimeString(),
          title: i.title,
          location: i.location,
          level: i.level || 'Warning',
          color: i.color || (i.level === 'Critical' ? 'red' : 'amber'),
          count: i.peakCount || 0,
          capacity: i.capacity || 200,
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
      if (alertRes && alertRes.data && Array.isArray(alertRes.data) && alertRes.data.length > 0) {
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
      if (auditRes && auditRes.data && Array.isArray(auditRes.data) && auditRes.data.length > 0) {
        const mappedLog = auditRes.data.map((d) => ({
          time: d.timeStr,
          timestamp: new Date(d.timestamp).getTime(),
          count: Number(d.count) || 0,
          zoneId: d.zoneId,
          zoneName: d.zoneName,
          latencyMs: d.latencyMs || 38,
          modelName: d.modelUsed || 'CSRNet',
          occupancyPct: d.occupancyPct || 0,
          capacity: d.capacity || 350,
          snapshotUrl: d.snapshotUrl || null,
          heatmapUrl: d.heatmapUrl || null
        }));

        const latest = mappedLog[0];
        set((prev) => {
          // If cameras exist and don't yet have lastSnapshot, hydrate with latest detection frame
          const updatedCams = prev.cameras.map((c, idx) => {
            if (idx === 0 && !c.lastSnapshot && latest.snapshotUrl) {
              return { ...c, lastSnapshot: latest.snapshotUrl, snapshotUrl: latest.snapshotUrl, heatmapUrl: latest.heatmapUrl };
            }
            return c;
          });

          return {
            cameras: updatedCams,
            detectionLog: [...mappedLog].reverse(),
            latestDetection: {
              ...latest,
              imageSrc: latest.snapshotUrl || null
            }
          };
        });
      }

      // 6. Check Health of Deep Learning Model
      const aiHealth = await apiClient.getAiHealth();
      if (aiHealth && aiHealth.status === 'online') {
        set({
          aiConnected: true,
          aiModelInfo: `CSRNet Dilated Conv (${aiHealth.device.toUpperCase()})`
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

  // Authentication Actions
  login: (email, password, role = 'admin') => {
    const selected = defaultUsers[role] || {
      id: `usr_${Date.now()}`,
      name: email ? email.split('@')[0] : 'Operator',
      email: email || 'operator@crowdsense.io',
      role,
      avatar: (email ? email.substring(0, 2) : 'OP').toUpperCase(),
      department: 'Operations',
      permissions: ['monitor']
    };
    set({
      user: selected,
      isAuthenticated: true,
      token: `jwt-token-${selected.role}-${Date.now()}`,
      showAuthModal: false,
      page: 'Dashboard'
    });
  },

  register: (userData) => {
    const roleKey = userData.role?.toLowerCase() || 'operator';
    const newUser = {
      id: `usr_${Date.now()}`,
      name: userData.name || 'New Member',
      email: userData.email,
      role: roleKey,
      avatar: (userData.name ? userData.name.substring(0, 2) : 'NM').toUpperCase(),
      department: userData.organization || 'Safety Operations',
      permissions: roleKey === 'admin' ? ['all'] : ['monitor', 'view_analytics']
    };
    set({
      user: newUser,
      isAuthenticated: true,
      token: `jwt-token-${newUser.role}-${Date.now()}`,
      showAuthModal: false,
      page: 'Dashboard'
    });
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      token: null,
      showProfileMenu: false,
      page: 'Dashboard'
    });
  },

  switchRole: (role) => {
    if (defaultUsers[role]) {
      set({
        user: defaultUsers[role],
        token: `jwt-token-${role}-${Date.now()}`,
        showProfileMenu: false
      });
    }
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
  setSandboxSnapshot: (sandboxSnapshot) => set({ sandboxSnapshot, page: 'Sandbox' }),

  // Camera Management
  addCamera: (newCam) => set((state) => {
    const scene = newCam.scene || 'concourse';
    const realCount = newCam.count !== undefined ? Number(newCam.count) : 0;
    const targetZone = state.zones.find((z) => z.id === newCam.zoneId) || state.zones[0] || { maxCapacity: 200, code: 'ZONE-01' };
    const maxCap = targetZone.maxCapacity || 200;
    const capPct = Math.min(100, Math.round((realCount / maxCap) * 100));

    const newCamObj = {
      id: `CAM-0${state.cameras.length + 1}`,
      name: newCam.name || 'New Camera Stream',
      zone: newCam.zone || targetZone.code || 'ZONE-01',
      zoneId: targetZone.id,
      count: realCount,
      capacity: capPct,
      maxCapacity: maxCap,
      status: 'Live',
      scene: scene,
      fps: Number(newCam.fps) || 2.0,
      latencyMs: 38,
      resolution: newCam.resolution || '1920x1080'
    };

    return {
      cameras: [...state.cameras, newCamObj],
      showAddCameraModal: false
    };
  }),

  deleteCamera: (id) => set((state) => ({
    cameras: state.cameras.filter((c) => c.id !== id)
  })),

  toggleWebcamFeed: () => {
    const state = get();
    const existing = state.cameras.find((c) => c.id === 'CAM-WEBCAM');
    if (existing) {
      set({
        cameras: state.cameras.filter((c) => c.id !== 'CAM-WEBCAM'),
        activeCameraId: state.cameras.find((c) => c.id !== 'CAM-WEBCAM')?.id || 'CAM-01'
      });
    } else {
      const targetZone = state.zones[0] || { maxCapacity: 350 };
      const webcamCam = {
        id: 'CAM-WEBCAM',
        name: 'Laptop Camera Feed (Live)',
        zone: 'OPERATOR · LOCAL 01',
        zoneId: targetZone.id,
        count: 1,
        capacity: Math.min(100, Math.round((1 / (targetZone.maxCapacity || 350)) * 100)),
        maxCapacity: targetZone.maxCapacity || 350,
        status: 'Live',
        scene: 'webcam',
        fps: 15.0,
        latencyMs: 32,
        resolution: '1280x720',
        isWebcam: true
      };
      set({
        cameras: [webcamCam, ...state.cameras],
        activeCameraId: 'CAM-WEBCAM'
      });
    }
  },

  setScannerTargetZoneId: (scannerTargetZoneId) => set({ scannerTargetZoneId }),

  inspectInCrowdSearch: (imageSrc, zoneId) => {
    const defaultZoneId = get().zones[0]?.id || 'zone-demo-01';
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
    const latencyMs = Number(payload.latencyMs) || 38;
    const defaultZone = state.zones[0] || { id: 'zone-demo-01', maxCapacity: 200, name: 'Default Zone', code: 'ZONE-01', criticalPct: 85, warningPct: 70 };
    const targetZoneId = payload.zoneId || state.scannerTargetZoneId || defaultZone.id;
    const targetZone = state.zones.find((z) => z.id === targetZoneId) || defaultZone;
    const targetCameraId = payload.cameraId || (state.cameras.some((c) => c.id === 'CAM-WEBCAM') ? 'CAM-WEBCAM' : state.cameras[0]?.id || 'CAM-01');
    const realFrame = payload.imageSrc || payload.snapshotUrl || null;
    const heatmapFrame = payload.heatmapUrl || null;

    // 1. Update Camera in State with real capture frame
    const updatedCameras = state.cameras.map((c) => {
      if (c.id === targetCameraId || (payload.isWebcam && c.id === 'CAM-WEBCAM') || state.cameras.length === 1) {
        const cap = Math.min(100, Math.round((count / (targetZone.maxCapacity || 200)) * 100));
        return {
          ...c,
          count,
          capacity: cap,
          maxCapacity: targetZone.maxCapacity || c.maxCapacity,
          latencyMs,
          status: 'Live',
          resolution: payload.resolution ? `${payload.resolution.width}x${payload.resolution.height}` : c.resolution,
          lastDetection: payload,
          lastSnapshot: realFrame || c.lastSnapshot,
          snapshotUrl: realFrame || c.snapshotUrl,
          streamUrl: realFrame || c.streamUrl,
          heatmapUrl: heatmapFrame || c.heatmapUrl
        };
      }
      return c;
    });

    // 2. Update Zone in State
    const updatedZones = state.zones.map((z) => {
      if (z.id === targetZoneId) {
        const occPct = Math.round((count / z.maxCapacity) * 100);
        const status = occPct >= z.criticalPct ? 'critical' : occPct >= z.warningPct ? 'warning' : 'normal';
        return {
          ...z,
          currentCount: count,
          occupancyPct: occPct,
          status,
          lastSnapshot: realFrame || z.lastSnapshot,
          heatmapUrl: heatmapFrame || z.heatmapUrl
        };
      }
      return z;
    });

    // 3. Automated Threshold Breach -> Generate Incident & Notification
    const occPct = Math.round((count / targetZone.maxCapacity) * 100);
    const isCritical = occPct >= targetZone.criticalPct;
    const isWarning = occPct >= targetZone.warningPct && !isCritical;

    let newIncidents = [...state.incidents];
    let newNotifications = [...state.notifications];

    if (isCritical || isWarning) {
      const nowStr = new Date().toLocaleTimeString();
      const level = isCritical ? 'Critical' : 'Warning';
      const color = isCritical ? 'red' : 'amber';
      const incidentId = `inc_${Date.now()}`;

      const newInc = {
        id: incidentId,
        time: nowStr,
        title: isCritical
          ? `Capacity ceiling breach (> ${targetZone.criticalPct}%)`
          : `Crowd influx surge alert (> ${targetZone.warningPct}%)`,
        location: `${targetZone.name} · ${targetZone.code}`,
        level,
        color,
        count,
        capacity: targetZone.maxCapacity,
        status: 'Open',
        notes: `Automated detection trigger via ${payload.modelName || 'CSRNet'}. Detected ${count} persons with ${latencyMs}ms inference latency.`,
        snapshotUrl: realFrame,
        snapshotBase64: realFrame,
        heatmapUrl: heatmapFrame,
        realDetection: payload
      };

      const newNotif = {
        id: `notif_${Date.now()}`,
        title: `${level === 'Critical' ? '🚨' : '⚠️'} ${targetZone.name}: ${occPct}% capacity (${count} people detected)`,
        time: nowStr,
        unread: true,
        level
      };

      // Avoid consecutive duplicate spam
      if (!newIncidents.some((i) => i.title === newInc.title && i.count === count)) {
        newIncidents = [newInc, ...newIncidents.slice(0, 15)];
      }
      newNotifications = [newNotif, ...newNotifications.slice(0, 15)];
    }

    // 4. Update Analytics History Time-Series
    const currentHourStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentTotal = updatedCameras.reduce((sum, c) => sum + c.count, 0);
    const existingHist = [...state.analyticsHistory];
    const lastHist = existingHist[existingHist.length - 1];

    const updatedHistory = [
      ...existingHist.slice(0, -1),
      {
        ...lastHist,
        total: currentTotal,
        influx: Math.max(10, Math.round(count * 0.45)),
        outflux: Math.max(5, Math.round(count * 0.2))
      },
      {
        hour: currentHourStr,
        influx: Math.max(15, Math.round(count * 0.5)),
        outflux: Math.max(5, Math.round(count * 0.15)),
        total: currentTotal
      }
    ].slice(-8);

    // 5. Append to detection log (feeds Forecast page with real data)
    const detectionEntry = {
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      count,
      zoneId: targetZoneId,
      zoneName: targetZone.name,
      latencyMs,
      modelName: payload.modelName || 'CSRNet',
      occupancyPct: occPct,
      capacity: targetZone.maxCapacity,
      snapshotUrl: realFrame,
      heatmapUrl: heatmapFrame
    };
    const prevLog = get().detectionLog || [];
    const updatedLog = [...prevLog, detectionEntry].slice(-50); // keep last 50 scans

    set({
      cameras: updatedCameras,
      zones: updatedZones,
      incidents: newIncidents,
      notifications: newNotifications,
      analyticsHistory: updatedHistory,
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
      occupancyPct: occPct,
      latencyMs,
      modelUsed: payload.modelName || 'CSRNet',
      peakDensity: payload.peakDensity || Number((count / targetZone.maxCapacity).toFixed(4)),
      snapshotUrl: realFrame,
      snapshotBase64: realFrame,
      heatmapUrl: heatmapFrame,
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
      description: newZone.description || 'Configured monitoring safety zone.'
    };

    set((state) => ({
      zones: [...state.zones, zoneObj]
    }));

    try {
      await apiClient.createZone({
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
    } catch (e) {
      console.warn('Persist zone failed:', e.message);
    }
  },

  deleteZone: async (zoneId) => {
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== zoneId)
    }));
    try {
      await apiClient.deleteZone(zoneId);
    } catch (e) {
      console.warn('Delete zone failed:', e.message);
    }
  },

  updateZone: async (zoneId, updates) => {
    set((state) => ({
      zones: state.zones.map((z) => {
        if (z.id === zoneId) {
          const updated = { ...z, ...updates };
          const cap = updated.maxCapacity || 200;
          const occ = Math.round(((updated.currentCount || 0) / cap) * 100);
          const status = occ >= updated.criticalPct ? 'critical' : occ >= updated.warningPct ? 'warning' : 'normal';
          return { ...updated, occupancyPct: occ, status };
        }
        return z;
      })
    }));

    try {
      await apiClient.updateZone(zoneId, updates);
    } catch (e) {
      console.warn('Update zone failed:', e.message);
    }
  },

  // Zone Thresholds
  updateZoneThresholds: async (zoneId, warningPct, criticalPct) => {
    set((state) => ({
      zones: state.zones.map((z) => {
        if (z.id === zoneId) {
          const occ = Math.round((z.currentCount / z.maxCapacity) * 100);
          const status = occ >= criticalPct ? 'critical' : occ >= warningPct ? 'warning' : 'normal';
          return { ...z, warningPct, criticalPct, status, occupancyPct: occ };
        }
        return z;
      })
    }));
    try {
      await apiClient.updateZone(zoneId, { warningThresholdPct: warningPct, criticalThresholdPct: criticalPct });
    } catch (e) {}
  },

  // Incident Actions
  resolveIncident: (id) => set((state) => ({
    incidents: state.incidents.map((inc) =>
      inc.id === id ? { ...inc, status: 'Resolved', level: 'Resolved', color: 'green' } : inc
    )
  })),

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
  setActiveModel: (modelName) => set((state) => ({
    models: state.models.map((m) => ({
      ...m,
      isActive: m.name === modelName
    }))
  }))
}));

// Real-Time Socket.io Live Telemetry Listener
try {
  const socketInstance = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
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
            return {
              ...c,
              count,
              capacity: cap,
              latencyMs: match.latencyMs || c.latencyMs
            };
          }
          return c;
        });

        const updatedZones = state.zones.map((z) => {
          const zoneCams = updatedCameras.filter((c) => c.zoneId === z.id);
          const zoneCount = zoneCams.reduce((sum, c) => sum + c.count, 0) || z.currentCount;
          const occ = Math.round((zoneCount / (z.maxCapacity || 200)) * 100);
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
          dbConnected: true,
          dbSource: tick.source === 'Local-MongoDB' ? 'MongoDB Local (27017)' : 'In-Memory Fallback',
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
