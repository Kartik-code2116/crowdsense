// In-memory sliding window rate limiter
const requestCounts = new Map();

const rateLimiter = (options = { windowMs: 60000, max: 120 }) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }
    
    const timestamps = requestCounts.get(ip).filter(time => now - time < options.windowMs);
    
    if (timestamps.length >= options.max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.'
      });
    }
    
    timestamps.push(now);
    requestCounts.set(ip, timestamps);
    next();
  };
};

module.exports = rateLimiter;
