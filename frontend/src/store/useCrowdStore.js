import { create } from 'zustand';
import { io } from 'socket.io-client';
import { apiClient } from '../api/client';

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
  { id: 'CAM-WEBCAM', name: 'Laptop Integrated Webcam', zone: 'HALL · ZONE 02', zoneId: 'z2', count: 2, capacity: 1, maxCapacity: 315, status: 'Live', scene: 'webcam', fps: 15.0, latencyMs: 38, resolution: '1280x720', isWebcam: true },
  { id: 'CAM-01', name: 'North entrance gate', zone: 'GATE A · ZONE 01', zoneId: 'z1', count: 0, capacity: 0, maxCapacity: 200, status: 'Live', scene: 'entrance', fps: 2.0, latencyMs: 38, resolution: '1920x1080' },
  { id: 'CAM-02', name: 'Central concourse atrium', zone: 'HALL · ZONE 02', zoneId: 'z2', count: 2, capacity: 1, maxCapacity: 315, status: 'Live', scene: 'concourse', fps: 2.0, latencyMs: 42, resolution: '2560x1440' },
  { id: 'CAM-03', name: 'East walkway promenade', zone: 'EAST · ZONE 03', zoneId: 'z3', count: 0, capacity: 0, maxCapacity: 200, status: 'Live', scene: 'walkway', fps: 2.0, latencyMs: 35, resolution: '1920x1080' },
  { id: 'CAM-04', name: 'Food court & dining hall', zone: 'FOOD COURT · ZONE 04', zoneId: 'z4', count: 0, capacity: 0, maxCapacity: 300, status: 'Live', scene: 'concourse', fps: 1.5, latencyMs: 39, resolution: '1920x1080' },
  { id: 'CAM-05', name: 'Gate B turnstiles', zone: 'GATE B · ZONE 05', zoneId: 'z1', count: 0, capacity: 0, maxCapacity: 200, status: 'Live', scene: 'entrance', fps: 2.0, latencyMs: 36, resolution: '1920x1080' }
];

const initialZones = [
  { id: 'z1', name: 'North entrance', code: 'GATE A · ZONE 01', currentCount: 0, maxCapacity: 200, warningPct: 70, criticalPct: 85, occupancyPct: 0, status: 'normal', egressCount: 4 },
  { id: 'z2', name: 'Central concourse', code: 'HALL · ZONE 02', currentCount: 2, maxCapacity: 315, warningPct: 75, criticalPct: 90, occupancyPct: 1, status: 'normal', egressCount: 6 },
  { id: 'z3', name: 'East walkway', code: 'EAST · ZONE 03', currentCount: 0, maxCapacity: 200, warningPct: 75, criticalPct: 90, occupancyPct: 0, status: 'normal', egressCount: 3 },
  { id: 'z4', name: 'Food court & lounge', code: 'LOUNGE · ZONE 04', currentCount: 0, maxCapacity: 300, warningPct: 75, criticalPct: 90, occupancyPct: 0, status: 'normal', egressCount: 5 }
];

const initialIncidents = [];

const initialNotifications = [
  { id: 'notif_init', title: 'System Online: All safety zones within safe operating limits', time: new Date().toLocaleTimeString(), unread: false, level: 'Info' }
];

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
  page: 'Landing',
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
  activeCameraId: 'CAM-02',
  dbConnected: true,
  dbSource: 'MongoDB Local (27017)',
  aiConnected: true,
  aiModelInfo: 'PyTorch YOLOv8 + CSRNet',
  lastSyncTimestamp: null,

  // Real-Time Cross-Feature Synchronization
  latestDetection: {
    count: 2,
    zoneName: 'Central Concourse Atrium',
    zoneId: 'z2',
    modelName: 'YOLOV8',
    latencyMs: 223.4,
    timestamp: new Date().toLocaleTimeString()
  },
  scannerTargetZoneId: 'z2',
  analyticsHistory: [
    { hour: '08:00', influx: 1, outflux: 0, total: 1 },
    { hour: '09:00', influx: 2, outflux: 1, total: 2 },
    { hour: '10:00', influx: 1, outflux: 1, total: 2 },
    { hour: '11:00', influx: 2, outflux: 0, total: 2 }
  ],

  fetchLiveData: async () => {
    try {
      // If real live AI detection is already running/active, preserve real data
      if (get().latestDetection) {
        set({ lastSyncTimestamp: new Date().toLocaleTimeString() });
        return;
      }
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
            resolution: c.resolution || '1920x1080'
          };
        });
        set({ cameras: mapped, dbConnected: true, dbSource: 'MongoDB Local (27017)' });
      }

      // 2. Fetch Zones from Local MongoDB
      const zoneRes = await apiClient.getZones();
      if (zoneRes && zoneRes.data && Array.isArray(zoneRes.data) && zoneRes.data.length > 0) {
        const mappedZones = zoneRes.data.map(z => ({
          id: z._id || z.id,
          name: z.name,
          code: z.code,
          currentCount: z.currentCount || 0,
          maxCapacity: z.maxCapacity || 200,
          warningPct: z.warningThresholdPct || 75,
          criticalPct: z.criticalThresholdPct || 90,
          occupancyPct: z.currentOccupancyPct || Math.round(((z.currentCount || 0) / (z.maxCapacity || 200)) * 100),
          status: (z.currentOccupancyPct >= (z.criticalThresholdPct || 90)) ? 'critical' : (z.currentOccupancyPct >= (z.warningThresholdPct || 75)) ? 'warning' : 'normal',
          egressCount: z.evacuationRoutes ? z.evacuationRoutes.length : 3
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
          count: i.peakCount || 140,
          capacity: i.capacity || 200,
          status: i.status || 'Open',
          notes: i.description || ''
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

      // 5. Check Health of FastAPI PyTorch Service
      const aiHealth = await apiClient.getAiHealth();
      if (aiHealth && aiHealth.status === 'online') {
        set({ aiConnected: true, aiModelInfo: `PyTorch CSRNet (${aiHealth.device.toUpperCase()})` });
      }

      set({ lastSyncTimestamp: new Date().toLocaleTimeString() });
    } catch (e) {
      console.warn('Real live data fetch fallback:', e.message);
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
      page: 'Landing'
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
  addCamera: (newCam) => set((state) => ({
    cameras: [
      ...state.cameras,
      {
        id: `CAM-0${state.cameras.length + 1}`,
        name: newCam.name || 'New Camera Stream',
        zone: newCam.zone || 'GATE C · ZONE 05',
        zoneId: newCam.zoneId || 'z1',
        count: Math.floor(Math.random() * 60) + 40,
        capacity: 45,
        maxCapacity: 200,
        status: 'Live',
        scene: 'entrance',
        fps: Number(newCam.fps) || 2.0,
        latencyMs: 38,
        resolution: newCam.resolution || '1920x1080'
      }
    ],
    showAddCameraModal: false
  })),

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
      const webcamCam = {
        id: 'CAM-WEBCAM',
        name: 'Laptop Camera Feed (Live)',
        zone: 'OPERATOR · LOCAL 01',
        zoneId: 'z1',
        count: 1,
        capacity: 10,
        maxCapacity: 50,
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
    set({
      sandboxSnapshot: imageSrc,
      scannerTargetZoneId: zoneId || 'z2',
      page: 'Crowd search'
    });
  },

  // Central Real Detection Dispatcher - connects Crowd Search & Cameras to Dashboard, Live Monitor, Analytics & Incidents
  recordRealDetection: (payload) => {
    const state = get();
    const count = Number(payload.count) || 0;
    const latencyMs = Number(payload.latencyMs) || 38;
    const targetZoneId = payload.zoneId || state.scannerTargetZoneId || 'z2';
    const targetZone = state.zones.find((z) => z.id === targetZoneId) || state.zones[1] || state.zones[0];
    const targetCameraId = payload.cameraId || (state.cameras.some((c) => c.id === 'CAM-WEBCAM') ? 'CAM-WEBCAM' : 'CAM-02');

    // 1. Update Camera in State
    const updatedCameras = state.cameras.map((c) => {
      if (c.id === targetCameraId || (payload.isWebcam && c.id === 'CAM-WEBCAM')) {
        const cap = Math.min(100, Math.round((count / (targetZone.maxCapacity || 200)) * 100));
        return {
          ...c,
          count,
          capacity: cap,
          maxCapacity: targetZone.maxCapacity || c.maxCapacity,
          latencyMs,
          status: 'Live',
          resolution: payload.resolution ? `${payload.resolution.width}x${payload.resolution.height}` : c.resolution,
          lastDetection: payload
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
          status
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
        notes: `Automated detection trigger via ${payload.modelName || 'YOLOv8'}. Detected ${count} persons with ${latencyMs}ms inference latency.`,
        snapshotUrl: payload.imageSrc || payload.heatmapUrl,
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

    set({
      cameras: updatedCameras,
      zones: updatedZones,
      incidents: newIncidents,
      notifications: newNotifications,
      analyticsHistory: updatedHistory,
      latestDetection: {
        ...payload,
        zoneName: targetZone.name,
        timestamp: new Date().toLocaleTimeString()
      },
      lastSyncTimestamp: new Date().toLocaleTimeString()
    });
  },

  // Zone Thresholds
  updateZoneThresholds: (zoneId, warningPct, criticalPct) => set((state) => ({
    zones: state.zones.map((z) => {
      if (z.id === zoneId) {
        const occ = Math.round((z.currentCount / z.maxCapacity) * 100);
        const status = occ >= criticalPct ? 'critical' : occ >= warningPct ? 'warning' : 'normal';
        return { ...z, warningPct, criticalPct, status, occupancyPct: occ };
      }
      return z;
    })
  })),

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
    // If real AI detection is active, preserve genuine detection numbers
    if (useCrowdStore.getState().latestDetection) {
      return;
    }
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
