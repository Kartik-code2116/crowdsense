const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

async function migrate() {
  const ownerEmail = String(process.env.MIGRATION_OWNER_EMAIL || '').trim().toLowerCase();
  if (!ownerEmail) throw new Error('Set MIGRATION_OWNER_EMAIL to the account that should own legacy records. No default owner is assumed.');

  await mongoose.connect(MONGODB_URI);
  try {
    const db = mongoose.connection.db;
    const owner = await db.collection('users').findOne({ email: ownerEmail });
    if (!owner) throw new Error(`No account exists for ${ownerEmail}.`);
    const ownerId = String(owner._id);
    const summaries = {};

    for (const collectionName of ['cameras', 'zones', 'incidents', 'alerts', 'detections']) {
      const result = await db.collection(collectionName).updateMany(
        { $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }] },
        { $set: { userId: ownerId } }
      );
      summaries[collectionName] = result.modifiedCount;
    }

    console.log(JSON.stringify({ owner: ownerEmail, migratedUnownedRecords: summaries }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error) => {
  console.error('Legacy ownership migration failed:', error.message);
  process.exitCode = 1;
});
