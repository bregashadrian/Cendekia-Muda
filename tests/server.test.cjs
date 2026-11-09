const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

let server, base, readConfig, errorHandler;
before(async () => {
  const { createApp } = await import('../server/src/app.js');
  ({ readConfig } = await import('../server/src/config.js'));
  ({ errorHandler } = await import('../server/src/middleware/errors.js'));
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('Server config defaults and invalid environment values are handled explicitly', () => {
  assert.deepEqual(readConfig({}), { nodeEnv: 'development', host: '127.0.0.1', port: 3000 });
  assert.equal(readConfig({ PORT: '4000', HOST: '0.0.0.0', NODE_ENV: 'production' }).port, 4000);
  for (const port of ['0', '65536', '3000abc', '-1', '3.14', '']) assert.throws(() => readConfig({ PORT: port }), /PORT/);
  assert.throws(() => readConfig({ NODE_ENV: 'invalid' }), /NODE_ENV/);
  assert.throws(() => readConfig({ HOST: 'https://localhost' }), /HOST/);
});

test('API liveness responds honestly without claiming a database connection', async () => {
  const response = await fetch(base + '/api/health');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-powered-by'), null);
  const health = await response.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.service, 'cendekia-muda-api');
  assert.ok(Number.isFinite(Date.parse(health.timestamp)));
  assert.ok(health.uptimeSeconds >= 0);
  const api = await fetch(base + '/api').then(r => r.json());
  assert.equal(api.database, 'not_connected');
});

test('Existing frontend and video byte ranges are served by Express', async () => {
  const html = await fetch(base + '/');
  assert.equal(html.status, 200);
  assert.match(await html.text(), /js\/management\.js/);
  for (const url of ['/script.js', '/style.css', '/js/data.js', '/js/core.js', '/js/management.js', '/assets/brand-logo.png']) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200, url);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    await response.arrayBuffer();
  }
  const video = await fetch(base + '/assets/video/pu.webm', { headers: { Range: 'bytes=0-9' } });
  assert.equal(video.status, 206);
  assert.match(video.headers.get('content-range'), /^bytes 0-9\//);
  assert.equal((await video.arrayBuffer()).byteLength, 10);
});

test('Config, source, documentation, dependencies and traversal paths are not public', async () => {
  for (const url of ['/.env', '/.env.example', '/.git/config', '/package.json', '/package-lock.json', '/server/src/server.js', '/tests/server.test.cjs', '/node_modules/express/package.json', '/assets/PRD.md', '/assets/README.md', '/js/..%2fserver/src/app.js', '/assets/..%2f.env', '/script.js/', '/cendekia_muda_database/01_schema.sql', '/tests/database.sql']) {
    const response = await fetch(base + url);
    assert.ok([403, 404].includes(response.status), `${url}: ${response.status}`);
    const body = await response.json();
    assert.ok(body.error.code);
    assert.equal(body.error.stack, undefined);
  }
});

test('Unknown API routes and invalid/oversized JSON return consistent errors', async () => {
  const missing = await fetch(base + '/api/not-found');
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  const invalid = await fetch(base + '/api/not-found', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"bad"' });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
  const oversized = await fetch(base + '/api/not-found', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(101 * 1024) }) });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'PAYLOAD_TOO_LARGE');
});

test('Unexpected server errors do not expose their internal message to the client', t => {
  t.mock.method(console, 'error', () => {});
  const error = new Error('internal-test-detail');
  let status, body;
  const response = { headersSent: false, status(value) { status = value; return this; }, json(value) { body = value; } };
  errorHandler(error, {}, response, () => assert.fail('Should produce JSON'));
  assert.equal(status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(body).includes('internal-test-detail'), false);
});

test('Startup explains port conflicts and invalid configuration instead of hanging', async () => {
  const launch = extra => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server/src/server.js'], {
      cwd: path.resolve(__dirname, '..'), env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', ...extra }, stdio: ['ignore', 'pipe', 'pipe']
    });
    let stderr = '';
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Startup did not finish')); }, 10000);
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', code => { clearTimeout(timeout); resolve({ code, stderr }); });
  });
  const conflict = await launch({ PORT: String(server.address().port) });
  assert.equal(conflict.code, 1);
  assert.match(conflict.stderr, /sedang digunakan/);
  const invalid = await launch({ PORT: 'not-a-port' });
  assert.equal(invalid.code, 1);
  assert.match(invalid.stderr, /Konfigurasi server gagal: PORT/);
});
