const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET, JWT_EXPIRES_IN, ADMIN_REGISTRATION_CODE, NODE_ENV } = require('../config/env');
const User = require('../models/User');
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
    if (!getIsConnected() && NODE_ENV === 'production') {
      return res.status(503).json({ success: false, message: 'Account registration is unavailable until the database is connected.' });
    }
    const { name, email, password, department, organization } = req.body;

    if (NODE_ENV === 'production') {
      const supplied = Buffer.from(String(req.body.inviteCode || ''));
      const expected = Buffer.from(ADMIN_REGISTRATION_CODE);
      if (supplied.length !== expected.length || !require('crypto').timingSafeEqual(supplied, expected)) {
        return res.status(403).json({ success: false, message: 'A valid administrator invitation code is required.' });
      }
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, corporate email, and password are required.'
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters long.'
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
      passwordHash: await bcrypt.hash(password, 10),
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

    if (!getIsConnected() && NODE_ENV === 'production') {
      return res.status(503).json({ success: false, message: 'Sign in is unavailable until the database is connected.' });
    }

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

    // Development-only in-memory accounts created by the registration flow.
    const store = getMemoryStore();
    const memUser = store.users.find(u => u.email === cleanEmail);
    if (!memUser || !memUser.passwordHash || !(await bcrypt.compare(password, memUser.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid administrator email or password.' });
    }
    const userId = memUser._id;
    const userName = memUser.name;

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
      return res.status(401).json({ success: false, message: 'This account is no longer available.' });
    }

    return res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name || 'Workspace user',
        email: req.user.email || '',
        role: 'admin',
        department: req.user.department || '',
        avatar: getInitials(req.user.name || 'Workspace user')
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
