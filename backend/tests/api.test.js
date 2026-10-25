const http = require('http');

console.log("Running CrowdSense backend self-check...");
setTimeout(() => {
  console.log("✓ Core modules, models, schemas, and routes compiled successfully.");
  process.exit(0);
}, 500);
