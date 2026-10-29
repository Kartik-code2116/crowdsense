const mongoose = require('mongoose');
const Camera = require('../models/Camera');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/crowdsense');
  await Camera.updateOne(
    { _id: 'CAM-9104' },
    {
      $set: {
        lastCount: 48,
        lastLatencyMs: 34,
        streamType: 'demo'
      }
    }
  );
  await Camera.updateOne(
    { _id: 'cam_1793270977403' },
    {
      $set: {
        lastCount: 56,
        lastLatencyMs: 36,
        streamType: 'youtube'
      }
    }
  );
  console.log('Successfully normalized camera records.');
  process.exit(0);
}

run().catch(console.error);
