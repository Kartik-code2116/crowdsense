const mongoose = require('mongoose');
const Zone = require('../models/Zone');
const User = require('../models/User');
const { MONGODB_URI } = require('../config/env');

async function createStarterZone() {
  const ownerEmail = String(process.env.SEED_USER_EMAIL || '').trim().toLowerCase();
  if (!ownerEmail) throw new Error('Set SEED_USER_EMAIL to an existing account email. No default user or password is created.');

  const owner = await User.findOne({ email: ownerEmail }).lean();
  if (!owner) throw new Error(`No account exists for ${ownerEmail}. Register and sign in before seeding a starter zone.`);

  const existing = await Zone.findOne({ userId: String(owner._id), code: 'ZONE-STARTER-01' }).lean();
  if (existing) {
    console.log(`Starter zone already exists for ${ownerEmail}: ${existing.name}`);
    return;
  }

  const zone = await Zone.create({
    _id: `zone-starter-${String(owner._id).slice(-8)}`,
    userId: String(owner._id),
    name: 'Starter Monitoring Zone',
    code: 'ZONE-STARTER-01',
    floor: 'Ground Level',
    maxCapacity: 200,
    warningThresholdPct: 70,
    criticalThresholdPct: 85,
    currentCount: 0,
    currentOccupancyPct: 0,
    evacuationRoutes: [],
    description: 'Starter configuration only. Add a reachable camera source to begin collecting observations.'
  });
  console.log(`Created starter zone for ${ownerEmail}: ${zone.name}`);
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    await createStarterZone();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Starter zone setup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { createStarterZone };
