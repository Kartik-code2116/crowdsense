const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');
const User = require('../models/User');
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Detection = require('../models/Detection');

async function resetUserData() {
  const ownerEmail = String(process.env.RESET_USER_EMAIL || '').trim().toLowerCase();
  const confirmation = String(process.env.CONFIRM_USER_DATA_RESET || '').trim().toLowerCase();
  if (!ownerEmail || confirmation !== ownerEmail) {
    throw new Error('Set RESET_USER_EMAIL and set CONFIRM_USER_DATA_RESET to the same email to delete only that account’s workspace.');
  }

  await mongoose.connect(MONGODB_URI);
  try {
    const owner = await User.findOne({ email: ownerEmail }).lean();
    if (!owner) throw new Error(`No account exists for ${ownerEmail}.`);
    const userId = String(owner._id);
    const result = {};
    for (const [name, Model] of Object.entries({ cameras: Camera, zones: Zone, incidents: Incident, alerts: Alert, detections: Detection })) {
      const deleted = await Model.deleteMany({ userId });
      result[name] = deleted.deletedCount;
    }
    console.log(JSON.stringify({ workspaceCleared: ownerEmail, deletedRecords: result, note: 'No sample user, camera, alert, or detection was created.' }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  resetUserData().catch((error) => {
    console.error('Workspace reset failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { resetUserData };
