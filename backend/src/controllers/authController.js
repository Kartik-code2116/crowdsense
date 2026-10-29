const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const User = require('../models/User');
const Zone = require('../models/Zone');
const Camera = require('../models/Camera');
const Alert = require('../models/Alert');
const { getIsConnected, getMemoryStore } = require('../config/db');

// Helper to compute 2-character avatar initials
const getInitials = (name) => {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Register a new Administrator Account
 * Enforces single-role 'admin' provisioning with separate, isolated user data workspace in MongoDB.
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, department, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, corporate email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const userDept = department || organization || 'Venue Safety & Operations Command';
    const avatar = getInitials(cleanName);

    if (getIsConnected()) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An administrator account with this corporate email already exists.'
        });
      }

      // Create new Admin in MongoDB
      const newUser = await User.create({
        name: cleanName,
        email: cleanEmail,
        password,
        role: 'admin',
        department: userDept,
        avatar
      });

      const newUserId = newUser._id.toString();

      // Automatically provision dedicated starter workspace data for this new admin
      // This guarantees each user's cameras, zones, and alerts are completely separate and distinct!
      const starterZoneId = `zone_${Date.now()}`;
      await Zone.create({
        _id: starterZoneId,
        userId: newUserId,
        name: `${cleanName.split(' ')[0]}'s Main Concourse`,
        code: `ZONE-${cleanName.substring(0, 3).toUpperCase()}-01`,
        floor: 'Level 1 Ingress',
        maxCapacity: 350,
        warningThresholdPct: 70,
        criticalThresholdPct: 85,
        currentCount: 0,
        currentOccupancyPct: 0,
        evacuationRoutes: ['Primary Egress North Gate', 'Emergency Corridors A & B'],
        description: `Dedicated safety operations sector provisioned for Administrator ${cleanName}.`,
        streamUrl: '/samples/mall_concourse.jpg',
        streamType: 'demo',
        createdAt: new Date()
      });

      await Camera.create({
        _id: `CAM-${Date.now().toString().slice(-4)}`,
        userId: newUserId,
        name: `${cleanName.split(' ')[0]} Sector Cam 01`,
        zoneId: starterZoneId,
        zoneName: `${cleanName.split(' ')[0]}'s Main Concourse`,
        streamUrl: '/samples/mall_concourse.jpg',
        resolution: '1920x1080',
        sampleFps: 2.0,
        status: 'Live',
        sceneType: 'concourse',
        lastCount: 0,
        lastLatencyMs: 38,
        lastActive: new Date()
      });

      await Alert.create({
        userId: newUserId,
        title: 'Safety Command Workspace Active',
        message: `Welcome Administrator ${cleanName}. Continuous density regression & edge streams initialized.`,
        level: 'Info',
        zoneId: starterZoneId,
        zoneName: `${cleanName.split(' ')[0]}'s Main Concourse`,
        cameraId: `CAM-01`,
        count: 0,
        capacity: 350,
        occupancyPct: 0,
        status: 'Resolved',
        createdAt: new Date()
      });

      const token = jwt.sign(
        { id: newUserId, role: 'admin', name: newUser.name, email: newUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        success: true,
        message: 'Administrator account provisioned successfully.',
        token,
        user: {
          id: newUserId,
          name: newUser.name,
          email: newUser.email,
          role: 'admin',
          department: newUser.department,
          avatar: newUser.avatar
        }
      });
    }

    // In-Memory Fallback
    const store = getMemoryStore();
    const existing = store.users.find(u => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Administrator account already exists in-memory.' });
    }

    const fallbackId = `usr_${Date.now()}`;
    const memUser = {
      _id: fallbackId,
      name: cleanName,
      email: cleanEmail,
      role: 'admin',
      department: userDept,
      avatar
    };
    store.users.push(memUser);

    const token = jwt.sign(
      { id: fallbackId, role: 'admin', name: cleanName, email: cleanEmail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Administrator account created (in-memory mode).',
      token,
      user: {
        id: fallbackId,
        name: cleanName,
        email: cleanEmail,
        role: 'admin',
        department: userDept,
        avatar
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Registration failed.'
    });
  }
};

/**
 * Login as Administrator
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if real Mongo
    if (getIsConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid administrator email or password.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid administrator email or password.' });
      }

      const token = jwt.sign(
        { id: user._id.toString(), role: 'admin', name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: 'admin',
          department: user.department,
          avatar: user.avatar
        }
      });
    }

    // In-memory fallback
    const store = getMemoryStore();
    const memUser = store.users.find(u => u.email === cleanEmail);
    const userId = memUser ? memUser._id : '6ade4cd5c5d2c1c0ec4762e5';
    const userName = memUser ? memUser.name : 'Alex Kumar';

    const token = jwt.sign(
      { id: userId, role: 'admin', name: userName, email: cleanEmail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: userId,
        name: userName,
        email: cleanEmail,
        role: 'admin',
        department: memUser ? memUser.department : 'Venue Operations Lead',
        avatar: getInitials(userName)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Authentication failed.'
    });
  }
};

/**
 * Get current authenticated administrator profile
 */
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    if (getIsConnected()) {
      const user = await User.findById(req.user.id).select('-password');
      if (user) {
        return res.json({
          success: true,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: 'admin',
            department: user.department,
            avatar: user.avatar
          }
        });
      }
    }

    return res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name || 'Alex Kumar',
        email: req.user.email || 'admin@crowdsense.io',
        role: 'admin',
        department: 'Venue Operations Lead',
        avatar: getInitials(req.user.name || 'Alex Kumar')
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
