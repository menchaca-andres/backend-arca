const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLogger } = require('../dist');

test('logger emite JSON con timestamp, servicio y nivel sin perder el contexto', () => {
  const lines = [];
  const log = createLogger('ms-personal', (line) => lines.push(JSON.parse(line)));
  log.info('Solicitud completada', { requestId: 'r1', status: 200 });
  log.warn('Reintento');
  log.error('Fallo');
  assert.deepEqual(lines.map((line) => line.level), ['info', 'warn', 'error']);
  assert.equal(lines[0].service, 'ms-personal');
  assert.match(lines[0].timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(lines[0].context, { requestId: 'r1', status: 200 });
});

test('logger oculta secretos anidados y cuerpos sin modificar el objeto original', () => {
  let line;
  const log = createLogger('test', (value) => { line = value; });
  const context = {
    passwordHash: 'hash-privado', DATABASE_URL: 'conexion-privada',
    headers: { Authorization: 'Bearer secreto', 'X-Internal-Key': 'clave-interna', Cookie: 'sesion' },
    items: [{ refresh_token: 'token-privado', jwtSecret: 'firma' }],
    body: { ci: '123' }, requestId: 'r1',
  };
  log.info('Evento', context);
  assert.doesNotMatch(line, /hash-privado|conexion-privada|Bearer secreto|clave-interna|token-privado|firma|123/);
  assert.equal(context.headers.Authorization, 'Bearer secreto');
  assert.equal(JSON.parse(line).context.requestId, 'r1');
});

test('logger sanea URLs y errores que pueden contener credenciales', () => {
  let line;
  const log = createLogger('test', (value) => { line = value; });
  log.error('Fallo en postgres://admin:secreto@host/db', {
    error: new Error('clave-privada'), url: 'https://host/?token=privado',
  });
  assert.doesNotMatch(line, /secreto|clave-privada|token=privado/);
  assert.equal(JSON.parse(line).context.error.name, 'Error');
});

test('logger soporta referencias circulares y bigint', () => {
  let line;
  const context = { id: 42n };
  context.self = context;
  createLogger('test', (value) => { line = value; }).info('Evento', context);
  assert.deepEqual(JSON.parse(line).context, { id: '42', self: '[Circular]' });
});

test('logger usa los canales de consola correspondientes por defecto', (t) => {
  const seen = [];
  for (const level of ['log', 'warn', 'error']) t.mock.method(console, level, () => seen.push(level));
  const log = createLogger('test');
  log.info('Info'); log.warn('Aviso'); log.error('Error');
  assert.deepEqual(seen, ['log', 'warn', 'error']);
});
