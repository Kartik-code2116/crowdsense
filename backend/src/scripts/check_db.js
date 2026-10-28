const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/crowdsense').then(async () => {
  const dets = await mongoose.connection.db.collection('detections').find().sort({ timestamp: -1 }).limit(5).toArray();
  console.log('Recent 5 Detections in Mongo:');
  console.log(dets);

  const cams = await mongoose.connection.db.collection('cameras').find().toArray();
  console.log('\nCameras in Mongo:');
  console.log(cams);

  const zones = await mongoose.connection.db.collection('zones').find().toArray();
  console.log('\nZones in Mongo:');
  console.log(zones);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
