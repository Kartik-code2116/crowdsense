const baseUrl = (process.env.CROWDSENSE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${data?.message || data}`);
  return data;
}

async function main() {
  const email = process.env.CROWDSENSE_EMAIL;
  const password = process.env.CROWDSENSE_PASSWORD;
  if (!email || !password) {
    throw new Error('Set CROWDSENSE_EMAIL and CROWDSENSE_PASSWORD for an existing account. This script only reads current status.');
  }

  const health = await request('/health');
  const auth = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!auth.token) throw new Error('Login did not return an authentication token.');

  const headers = { Authorization: `Bearer ${auth.token}` };
  const [zones, cameras] = await Promise.all([
    request('/api/v1/zones', { headers }),
    request('/api/v1/cameras', { headers })
  ]);

  console.log(JSON.stringify({
    api: { status: health.status, database: health.database },
    workspace: auth.user?.email,
    zones: (zones.data || []).map((zone) => ({ id: zone._id, name: zone.name, capacity: zone.maxCapacity })),
    cameras: (cameras.data || []).map((camera) => ({ id: camera._id, name: camera.name, sourceType: camera.streamType, status: camera.status, lastSampleAt: camera.lastActive || null }))
  }, null, 2));
}

main().catch((error) => {
  console.error('Read-only status check failed:', error.message);
  process.exitCode = 1;
});
