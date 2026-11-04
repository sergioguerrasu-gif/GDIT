const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

// BD falsa en memoria: pruebas unitarias sin depender de PostgreSQL.
function fakeDb({ fail = false } = {}) {
  const items = [];
  return {
    write: async (sql, params) => {
      if (fail) throw new Error('db caida');
      if (sql.startsWith('INSERT')) {
        const item = { id: items.length + 1, name: params[0], created_at: new Date().toISOString() };
        items.push(item);
        return { rows: [item] };
      }
      return { rows: [{ now: new Date().toISOString() }] };
    },
    read: async (sql) => {
      if (fail) throw new Error('db caida');
      if (sql.includes('pg_is_in_recovery')) return { rows: [{ is_replica: true }] };
      return { rows: [...items].reverse() };
    },
  };
}

let server;
let okUrl;
let failServer;
let failUrl;

before(async () => {
  server = createApp(fakeDb()).listen(0);
  okUrl = `http://127.0.0.1:${server.address().port}`;
  failServer = createApp(fakeDb({ fail: true })).listen(0);
  failUrl = `http://127.0.0.1:${failServer.address().port}`;
});

after(() => {
  server.close();
  failServer.close();
});

test('GET /health responde 200 y status ok', async () => {
  const res = await fetch(`${okUrl}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.ok(body.instance);
  assert.ok(res.headers.get('x-instance'));
});

test('GET /health sigue en 200 aunque la BD este caida', async () => {
  const res = await fetch(`${failUrl}/health`);
  assert.strictEqual(res.status, 200);
});

test('GET /api/test valida conexion a la BD y uso de replica', async () => {
  const res = await fetch(`${okUrl}/api/test`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.read_connection_is_replica, true);
});

test('GET /api/test responde 503 si la BD falla', async () => {
  const res = await fetch(`${failUrl}/api/test`);
  assert.strictEqual(res.status, 503);
});

test('POST /api/items valida el cuerpo', async () => {
  const res = await fetch(`${okUrl}/api/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(res.status, 400);
});

test('POST y GET /api/items crean y listan registros', async () => {
  const post = await fetch(`${okUrl}/api/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'prueba' }),
  });
  assert.strictEqual(post.status, 201);
  const list = await fetch(`${okUrl}/api/items`);
  const body = await list.json();
  assert.strictEqual(body.items[0].name, 'prueba');
});

test('GET /api/load consume CPU y limita el parametro ms', async () => {
  const t0 = Date.now();
  const res = await fetch(`${okUrl}/api/load?ms=20`);
  const elapsed = Date.now() - t0;
  assert.strictEqual(res.status, 200);
  assert.ok(elapsed >= 20);
  const body = await res.json();
  assert.strictEqual(body.burned_ms, 20);

  const capped = await fetch(`${okUrl}/api/load?ms=99999`);
  assert.strictEqual((await capped.json()).burned_ms, 200);
});

test('GET /openapi.json documenta los endpoints', async () => {
  const res = await fetch(`${okUrl}/openapi.json`);
  assert.strictEqual(res.status, 200);
  const spec = await res.json();
  for (const p of ['/health', '/api/test', '/api/items', '/api/load']) {
    assert.ok(spec.paths[p], `falta ${p}`);
  }
});

test('GET /docs sirve la UI de Swagger', async () => {
  const res = await fetch(`${okUrl}/docs/`);
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /swagger/i);
});
