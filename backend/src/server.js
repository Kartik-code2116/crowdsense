const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const { PORT, CORS_ORIGIN } = require('./config/env');
const { connectDB } = require('./config/db');
const { populateSeedData } = require('./scripts/seed');
const initializeLiveFeedSocket = require('./sockets/liveFeed');
const videoProcessorWorker = require('./jobs/videoProcessor');
const alertEngine = require('./services/alertEngine');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const cameraRoutes = require('./routes/cameras');
const zoneRoutes = require('./routes/zones');
const analyzeRoutes = require('./routes/analyze');
const alertRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');

const app = express();
const server = http.createServer(app);

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
alertEngine.setSocketIO(io);
initializeLiveFeedSocket(io);

// Core Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cameras', cameraRoutes);
app.use('/api/v1/zones', zoneRoutes);
app.use('/api/v1/analyze', analyzeRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingRoutes);

// Health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'CrowdSense API Gateway',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Error handling middleware
app.use(errorHandler);

// Server startup
async function startServer() {
  await connectDB();
  populateSeedData();
  videoProcessorWorker.start();

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` CrowdSense API Gateway running on http://localhost:${PORT}`);
    console.log(` Real-time WebSocket live delivery initialized`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

startServer();

module.exports = { app, server };
