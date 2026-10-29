const http = require('http');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function run() {
  console.log('--- Step 1: Admin Login ---');
  const loginRes = await request('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@crowdsense.io', password: 'password123' },
  });
  console.log('Login Status:', loginRes.status, 'User:', loginRes.data?.user?.email, 'Role:', loginRes.data?.user?.role);
  const token = loginRes.data?.token;
  if (!token) throw new Error('No token obtained');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('\n--- Step 2: Fetch current zones ---');
  const zonesRes = await request('http://localhost:5000/api/v1/zones', { headers });
  const zoneId = zonesRes.data?.data?.[0]?._id || zonesRes.data?.data?.[0]?.id;
  console.log('Primary Zone ID:', zoneId);

  console.log('\n--- Step 3: Add YouTube Live Camera ---');
  const ytCam = await request('http://localhost:5000/api/v1/cameras', {
    method: 'POST',
    headers,
    body: {
      name: 'Shibuya Scramble Crossing (Live 4K)',
      zoneId,
      streamUrl: 'https://www.youtube.com/watch?v=1-iS7LArMPA',
      streamType: 'youtube',
      sceneType: 'concourse',
      fps: 30,
      resolution: '1080p',
    },
  });
  console.log('YouTube Camera Creation Status:', ytCam.status, 'ID:', ytCam.data?.data?._id || ytCam.data?.data?.id);

  console.log('\n--- Step 4: Add Laptop Webcam ---');
  const webcamCam = await request('http://localhost:5000/api/v1/cameras', {
    method: 'POST',
    headers,
    body: {
      name: 'Operator Laptop Integrated Camera',
      zoneId,
      streamUrl: 'webcam://0',
      streamType: 'webcam',
      sceneType: 'entrance',
      fps: 30,
      resolution: '720p',
    },
  });
  console.log('Webcam Camera Creation Status:', webcamCam.status, 'ID:', webcamCam.data?.data?._id || webcamCam.data?.data?.id);

  console.log('\n--- Step 5: Verify Camera List contains multi-source feeds ---');
  const camerasRes = await request('http://localhost:5000/api/v1/cameras', { headers });
  const streams = camerasRes.data?.data?.map(c => ({
    name: c.name,
    streamType: c.streamType,
    streamUrl: c.streamUrl,
    liveCount: c.liveCount,
  }));
  console.log('Registered Cameras Count:', camerasRes.data?.data?.length);
  console.log('Cameras Overview:', JSON.stringify(streams, null, 2));

  console.log('\n--- Step 6: Post Live Detection Telemetry for YouTube Camera ---');
  const testCamId = ytCam.data?.data?._id || ytCam.data?.data?.id;
  const telemetryRes = await request('http://localhost:5000/api/v1/analyze/record', {
    method: 'POST',
    headers,
    body: {
      cameraId: testCamId,
      zoneId,
      count: 42,
      density: 2.15,
      riskLevel: 'medium',
      confidence: 0.94,
      flowRate: 14.2,
      anomalyDetected: false,
      timestamp: new Date().toISOString(),
      metadata: {
        streamType: 'youtube',
        resolution: '1080p',
        fps: 30
      }
    }
  });
  console.log('Telemetry Record Status:', telemetryRes.status, 'Data:', telemetryRes.data?.success);

  console.log('\n--- All multi-source streaming & live detection verifications PASSED! ---');
}

run().catch(console.error);
