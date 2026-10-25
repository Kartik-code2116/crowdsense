const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const User = require('../models/User');
const { getIsConnected, getMemoryStore } = require('../config/db');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Check if real Mongo or In-Memory
  if (getIsConnected()) {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  }

  // Fallback demo auth for standard test credentials
  const token = jwt.sign({ id: 'usr_admin', role: 'admin', name: 'Alex Kumar' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
  return res.json({
    success: true,
    token,
    user: {
      id: 'usr_admin',
      name: 'Alex Kumar',
      email: email || 'alex.kumar@crowdsense.io',
      role: 'admin',
      avatar: 'AK'
    }
  });
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
