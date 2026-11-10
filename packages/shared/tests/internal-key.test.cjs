const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { requireInternalKey, errorHandler } = require('../dist');

let server;
let origin;
before(async () => {
  const protect = requireInternalKey('test-key-not-for-deployment');
  // Adaptador HTTP minimo para probar el contrato req/res/next del middleware.
  // No se agrega ningun endpoint a los servicios de la aplicacion.
  server = http.createServer((req, res) => {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    if (req.url === '/health') return res.json({ status: 'OK' });
    protect(req, res, (error) => {
      if (error) errorHandler(error, req, res, () => assert.fail('Error sin manejar'));
      else res.json({ allowed: true });
    });
  });
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
});

for (const [name, headers] of [
  ['sin clave', {}],
  ['clave incorrecta de igual longitud', { 'X-Internal-Key': 'test-key-not-for-deploymenX' }],
  ['clave incorrecta de otra longitud', { 'X-Internal-Key': 'otra' }],
  ['clave vacia', { 'X-Internal-Key': '' }],
]) {
  test(`proteccion interna responde 401: ${name}`, async () => {
    const res = await fetch(`${origin}/internal/probe`, { headers });
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), {
      code: 'UNAUTHORIZED', message: 'Clave interna ausente o invalida', details: null,
    });
  });
}

test('proteccion interna permite la clave correcta y cabecera en minusculas', async () => {
  const res = await fetch(`${origin}/internal/probe`, { headers: { 'x-internal-key': 'test-key-not-for-deployment' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { allowed: true });
});

test('proteccion interna no afecta rutas publicas', async () => {
  const res = await fetch(`${origin}/health`);
  assert.equal(res.status, 200);
  await res.arrayBuffer();
});

test('proteccion interna rechaza configuracion vacia al crear el middleware', () => {
  assert.throws(() => requireInternalKey(''), /INTERNAL_API_KEY/);
  assert.throws(() => requireInternalKey('  '), /INTERNAL_API_KEY/);
});

test('proteccion interna rechaza multiples valores de la cabecera', async () => {
  const res = await fetch(`${origin}/internal/probe`, {
    headers: [['X-Internal-Key', 'test-key-not-for-deployment'], ['X-Internal-Key', 'otra']],
  });
  assert.equal(res.status, 401);
  await res.arrayBuffer();
});
