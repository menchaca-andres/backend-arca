const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AppError, errorStatus, errorHandler } = require('../dist');

test('AppError conserva el formato comun y los estados HTTP acordados', () => {
  assert.deepEqual(errorStatus, {
    VALIDATION_ERROR: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
    CONFLICT: 409, SERVICE_UNAVAILABLE: 503, INTERNAL_ERROR: 500,
  });
  for (const [code, status] of Object.entries(errorStatus)) {
    const error = new AppError(code, 'Mensaje seguro', { field: 'nombre' });
    assert.equal(error.statusCode, status);
    assert.deepEqual(error.toResponse(), { code, message: 'Mensaje seguro', details: { field: 'nombre' } });
  }
});

test('AppError usa details null cuando no hay detalles', () => {
  assert.deepEqual(new AppError('NOT_FOUND', 'No encontrado').toResponse(), {
    code: 'NOT_FOUND', message: 'No encontrado', details: null,
  });
});

test('errorHandler responde con el estado y formato de AppError', () => {
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  errorHandler(new AppError('CONFLICT', 'Ya existe'), {}, res, () => assert.fail('No debe delegar'));
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { code: 'CONFLICT', message: 'Ya existe', details: null });
});

test('errorHandler oculta mensajes, stacks y credenciales de errores inesperados', (t) => {
  const lines = [];
  t.mock.method(console, 'error', (line) => lines.push(line));
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  errorHandler(new Error('password=super-secreto postgres://user:clave@host/db'), {}, res, () => assert.fail());
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null });
  assert.equal(lines.length, 1);
  assert.doesNotMatch(JSON.stringify([lines, res.body]), /super-secreto|clave|stack|postgres:/);
});

test('errorHandler delega cuando las cabeceras ya fueron enviadas', () => {
  const original = new Error('fallo');
  let delegated;
  errorHandler(original, {}, { headersSent: true }, (error) => { delegated = error; });
  assert.equal(delegated, original);
});

test('errorHandler no registra strings u objetos inesperados con datos sensibles', (t) => {
  const lines = [];
  t.mock.method(console, 'error', (line) => lines.push(line));
  for (const error of ['password=clave-privada', { message: 'clave-privada' }]) {
    const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
    errorHandler(error, {}, res, () => assert.fail());
    assert.equal(res.statusCode, 500);
    assert.doesNotMatch(JSON.stringify([lines, res.body]), /clave-privada/);
  }
});
