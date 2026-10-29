const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    // Find or create primary admin
    let admin = await db.collection('users').findOne({ email: 'admin@crowdsense.io' });
    if (admin) {
      await db.collection('users').updateOne(
        { _id: admin._id },
        { $set: { role: 'admin' } }
      );
    }

    // Remove any user with a role other than 'admin'
    const delResult = await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    console.log('✓ Deleted non-admin users count:', delResult.deletedCount);

    const adminId = admin ? String(admin._id) : '6ade4cd5c5d2c1c0ec4762e5';
    console.log('✓ Primary Admin ID for existing data isolation:', adminId);

    // Update existing data to belong to primary admin
    const camRes = await db.collection('cameras').updateMany(
      { $or: [{ userId: { $exists: false } }, { userId: null }] },
      { $set: { userId: adminId } }
    );
    console.log('✓ Updated cameras with userId:', camRes.modifiedCount);

    const zoneRes = await db.collection('zones').updateMany(
      { $or: [{ userId: { $exists: false } }, { userId: null }] },
      { $set: { userId: adminId } }
    );
    console.log('✓ Updated zones with userId:', zoneRes.modifiedCount);

    const incRes = await db.collection('incidents').updateMany(
      { $or: [{ userId: { $exists: false } }, { userId: null }] },
      { $set: { userId: adminId } }
    );
    console.log('✓ Updated incidents with userId:', incRes.modifiedCount);

    const alertRes = await db.collection('alerts').updateMany(
      { $or: [{ userId: { $exists: false } }, { userId: null }] },
      { $set: { userId: adminId } }
    );
    console.log('✓ Updated alerts with userId:', alertRes.modifiedCount);

    const detRes = await db.collection('detections').updateMany(
      { $or: [{ userId: { $exists: false } }, { userId: null }] },
      { $set: { userId: adminId } }
    );
    console.log('✓ Updated detections with userId:', detRes.modifiedCount);

    const users = await db.collection('users').find({}).toArray();
    console.log('✓ Current Verified Admin Users in MongoDB:');
    users.forEach(u => console.log(`  - ${u.name} <${u.email}> | role: ${u.role} | id: ${u._id}`));

    console.log('✅ MongoDB migration complete: Only Admin role active, all data scoped with userId.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
