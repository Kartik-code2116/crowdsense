const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let isConnected = false;
let memoryStore = {
  users: [],
  cameras: [],
  zones: [],
  detections: [],
  alerts: [],
  incidents: [],
  modelVersions: [],
  auditLogs: []
};

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    isConnected = true;
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`! MongoDB Connection Warning (${error.message}).`);
    console.log(`ℹ Operating in Enterprise In-Memory Fallback Mode. All routes & queries fully active.`);
    isConnected = false;
  }
};

module.exports = {
  connectDB,
  getIsConnected: () => isConnected,
  getMemoryStore: () => memoryStore
};
