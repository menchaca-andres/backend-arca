const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { AppError, HttpClient, HTTP_TIMEOUT_MS, HTTP_RETRIES } = require('../dist');

let server;
let origin;
const counts = new Map();
before(async () => {
  server = http.createServer(async (req, res) => {
    const count = (counts.get(req.url) ?? 0) + 1;
    counts.set(req.url, count);
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/echo?q=1') {
      let body = '';
      for await (const chunk of req) body += chunk;
      res.end(JSON.stringify({ method: req.method, body: JSON.parse(body), key: req.headers['x-internal-key'], custom: req.headers['x-request-id'] }));
    } else if (req.url === '/empty') {
      res.writeHead(204).end();
    } else if (req.url === '/invalid') {
      res.end('no es JSON');
    } else if (req.url === '/not-found') {
      res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'detalle secreto' }));
    } else if (req.url === '/conflict') {
      res.writeHead(409).end(JSON.stringify({ code: 'CONFLICT', message: 'duplicado' }));
    } else if (req.url === '/server-error') {
      res.writeHead(500).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'detalle secreto' }));
    } else if (req.url === '/unexpected') {
      res.writeHead(418).end(JSON.stringify({ code: 'NO_CONOCIDO', message: 'detalle secreto' }));
    } else if (req.url === '/transient' && count === 1) {
      res.writeHead(502).end('{}');
    } else if (req.url.startsWith('/unavailable/')) {
      res.writeHead(Number(req.url.split('/').pop())).end('{}');
    } else if (req.url === '/redirect') {
      res.writeHead(302, { Location: '/redirect-target' }).end('{}');
    } else {
      res.end(JSON.stringify({ ok: true }));
    }
  });
  await new Promise((resolve, reject) => { server.listen(0, '127.0.0.1', resolve); server.once('error', reject); });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
});
const client = () => new HttpClient({ baseUrl: origin, internalApiKey: 'test-client-key' });

test('cliente HTTP envia JSON, query y clave interna configurada sin permitir sobrescribirla', async () => {
  const data = await client().request('/echo?q=1', {
    method: 'POST', body: { value: 123 }, headers: { 'x-internal-key': 'otra', 'X-Request-Id': 'r1' },
  });
  assert.deepEqual(data, { method: 'POST', body: { value: 123 }, key: 'test-client-key', custom: 'r1' });
  assert.equal(counts.get('/echo?q=1'), 1);
});

test('cliente HTTP acepta 204 sin intentar parsear JSON vacio', async () => {
  assert.equal(await client().request('/empty'), undefined);
});

test('cliente HTTP recupera un 502 transitorio con exactamente un reintento', async () => {
  assert.deepEqual(await client().request('/transient'), { ok: true });
  assert.equal(counts.get('/transient'), 2);
});

for (const status of [502, 503, 504]) {
  test(`cliente HTTP devuelve 503 tras dos respuestas ${status}`, async () => {
    const path = `/unavailable/${status}`;
    await assert.rejects(client().request(path), (error) => error instanceof AppError
      && error.statusCode === 503 && error.code === 'SERVICE_UNAVAILABLE');
    assert.equal(counts.get(path), 2);
  });
}

for (const [path, status, code] of [['/not-found', 404, 'NOT_FOUND'], ['/conflict', 409, 'CONFLICT'], ['/server-error', 500, 'INTERNAL_ERROR']]) {
  test(`cliente HTTP conserva ${code} sin reintentar ni reflejar detalles remotos`, async () => {
    await assert.rejects(client().request(path), (error) => error.statusCode === status
      && error.code === code && !error.message.includes('detalle secreto') && error.details === null);
    assert.equal(counts.get(path), 1);
  });
}

test('cliente HTTP convierte una respuesta no JSON en error comun 503', async () => {
  await assert.rejects(client().request('/invalid'), { code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
  assert.equal(counts.get('/invalid'), 1);
});

test('cliente HTTP convierte errores fuera del contrato en 503', async () => {
  await assert.rejects(client().request('/unexpected'), { code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
});

test('cliente HTTP reintenta una sola vez ante fallo de red', async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => { attempts++; throw new TypeError('conexion privada'); });
  await assert.rejects(client().request('/network'), (error) => error.code === 'SERVICE_UNAVAILABLE'
    && error.statusCode === 503 && !error.message.includes('privada'));
  assert.equal(attempts, 2);
});

test('cliente HTTP aplica 3000 ms por defecto, aborta cada intento y termina con 503', { timeout: 9000 }, async (t) => {
  assert.equal(HTTP_TIMEOUT_MS, 3000);
  assert.equal(HTTP_RETRIES, 1);
  const elapsed = [];
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    const started = Date.now();
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => { elapsed.push(Date.now() - started); reject(signal.reason); }, { once: true });
    });
  });
  await assert.rejects(client().request('/timeout'), { code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
  assert.equal(elapsed.length, 2);
  for (const duration of elapsed) assert.ok(duration >= 2900 && duration < 4500, `timeout observado: ${duration} ms`);
});

test('cliente HTTP limita tambien el tiempo de lectura del cuerpo', async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    attempts++;
    return new Response(new ReadableStream({
      start(controller) { signal.addEventListener('abort', () => controller.error(signal.reason), { once: true }); },
    }));
  });
  const shortClient = new HttpClient({ baseUrl: origin, internalApiKey: 'test', timeoutMs: 25 });
  await assert.rejects(shortClient.request('/slow-body'), { code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
  assert.equal(attempts, 2);
});

test('cliente HTTP impide enviar la clave a otro origen', async () => {
  await assert.rejects(client().request('https://otro.example/internal'), /origen configurado/);
  await assert.rejects(client().request('//otro.example/internal'), /origen configurado/);
});

test('cliente HTTP no sigue redirects ni filtra la clave a su destino', async () => {
  await assert.rejects(client().request('/redirect'), { code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
  assert.equal(counts.get('/redirect'), 2);
  assert.equal(counts.get('/redirect-target'), undefined);
});

test('cliente HTTP valida protocolo, credenciales, clave y timeout al construirlo', () => {
  for (const baseUrl of ['ftp://host', 'http://user:password@host']) {
    assert.throws(() => new HttpClient({ baseUrl, internalApiKey: 'test' }), /HTTP sin credenciales/);
  }
  assert.throws(() => new HttpClient({ baseUrl: origin, internalApiKey: '' }), /INTERNAL_API_KEY/);
  for (const timeoutMs of [0, -1, Infinity, NaN]) {
    assert.throws(() => new HttpClient({ baseUrl: origin, internalApiKey: 'test', timeoutMs }), /positivo/);
  }
});
