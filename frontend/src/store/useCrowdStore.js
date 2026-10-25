import { create } from 'zustand';

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
  { id: 'CAM-01', name: 'North entrance gate', zone: 'GATE A · ZONE 01', zoneId: 'z1', count: 142, capacity: 71, maxCapacity: 200, status: 'Live', scene: 'entrance', fps: 2.0, latencyMs: 38, resolution: '1920x1080' },
  { id: 'CAM-02', name: 'Central concourse atrium', zone: 'HALL · ZONE 02', zoneId: 'z2', count: 286, capacity: 91, maxCapacity: 315, status: 'Live', scene: 'concourse', fps: 2.0, latencyMs: 42, resolution: '2560x1440' },
  { id: 'CAM-03', name: 'East walkway promenade', zone: 'EAST · ZONE 03', zoneId: 'z3', count: 86, capacity: 43, maxCapacity: 200, status: 'Live', scene: 'walkway', fps: 2.0, latencyMs: 35, resolution: '1920x1080' },
  { id: 'CAM-04', name: 'Food court & dining hall', zone: 'FOOD COURT · ZONE 04', zoneId: 'z4', count: 192, capacity: 64, maxCapacity: 300, status: 'Live', scene: 'concourse', fps: 1.5, latencyMs: 39, resolution: '1920x1080' },
  { id: 'CAM-05', name: 'Gate B turnstiles', zone: 'GATE B · ZONE 05', zoneId: 'z1', count: 98, capacity: 49, maxCapacity: 200, status: 'Live', scene: 'entrance', fps: 2.0, latencyMs: 36, resolution: '1920x1080' },
  { id: 'CAM-06', name: 'Emergency egress corridor', zone: 'EGRESS · ZONE 06', zoneId: 'z2', count: 24, capacity: 16, maxCapacity: 150, status: 'Live', scene: 'walkway', fps: 1.0, latencyMs: 33, resolution: '1920x1080' }
];

const initialZones = [
  { id: 'z1', name: 'North entrance', code: 'GATE A · ZONE 01', currentCount: 142, maxCapacity: 200, warningPct: 70, criticalPct: 85, occupancyPct: 71, status: 'warning', egressCount: 4 },
  { id: 'z2', name: 'Central concourse', code: 'HALL · ZONE 02', currentCount: 286, maxCapacity: 315, warningPct: 75, criticalPct: 90, occupancyPct: 91, status: 'critical', egressCount: 6 },
  { id: 'z3', name: 'East walkway', code: 'EAST · ZONE 03', currentCount: 86, maxCapacity: 200, warningPct: 75, criticalPct: 90, occupancyPct: 43, status: 'normal', egressCount: 3 },
  { id: 'z4', name: 'Food court & lounge', code: 'LOUNGE · ZONE 04', currentCount: 192, maxCapacity: 300, warningPct: 75, criticalPct: 90, occupancyPct: 64, status: 'normal', egressCount: 5 }
];

const initialIncidents = [
  { id: 'inc_01', time: '14:32:08', title: 'Capacity threshold exceeded (>90%)', location: 'Central concourse · Zone 02', level: 'Critical', color: 'red', count: 286, capacity: 315, status: 'Open', notes: 'Automated sirens activated. West turnstile flow restricted.' },
  { id: 'inc_02', time: '14:18:41', title: 'Crowd density increasing rapidly', location: 'North entrance · Zone 01', level: 'Warning', color: 'amber', count: 142, capacity: 200, status: 'Open', notes: 'Monitored 22% influx from subway connection.' },
  { id: 'inc_03', time: '13:56:12', title: 'Camera feed restored & synced', location: 'East walkway · Zone 03', level: 'Resolved', color: 'green', count: 86, capacity: 200, status: 'Resolved', notes: 'Stream reconnected at 2.0 FPS with 35ms latency.' }
];

const initialNotifications = [
  { id: 'notif_1', title: 'Critical Alert: Zone 02 Breach', time: '14:32:08', unread: true, level: 'Critical' },
  { id: 'notif_2', title: 'Predictive Warning: Overcrowding in 8 min', time: '14:28:00', unread: true, level: 'Warning' },
  { id: 'notif_3', title: 'Shift 02 Safety Handover Complete', time: '14:00:00', unread: false, level: 'Info' }
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

  // Live Data
  cameras: initialCameras,
  zones: initialZones,
  incidents: initialIncidents,
  notifications: initialNotifications,
  models: initialModels,
  activeCameraId: 'CAM-02',

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
