require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? '' : 'dev-only-crowdsense-jwt-secret-change-before-deployment');
const ADMIN_REGISTRATION_CODE = process.env.ADMIN_REGISTRATION_CODE || '';
const allowedOrigins = (process.env.CORS_ORIGIN || (NODE_ENV === 'production' ? '' : '*'))
  .split(',').map((origin) => origin.trim()).filter(Boolean);

if (NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a unique secret of at least 32 characters before starting in production.');
}
if (NODE_ENV === 'production' && (!allowedOrigins.length || allowedOrigins.includes('*'))) {
  throw new Error('Set CORS_ORIGIN to the trusted frontend origin(s) before starting in production.');
}
if (NODE_ENV === 'production' && ADMIN_REGISTRATION_CODE.length < 24) {
  throw new Error('Set ADMIN_REGISTRATION_CODE to a unique invite secret of at least 24 characters before starting in production.');
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crowdsense',
  JWT_SECRET,
  ADMIN_REGISTRATION_CODE,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  CORS_ORIGIN: allowedOrigins.length ? allowedOrigins : '*'
};
