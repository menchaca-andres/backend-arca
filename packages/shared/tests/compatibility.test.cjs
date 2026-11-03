const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AppError, InternalClient, HttpClient, logger } = require('../dist');
test('conserva AppError con details del contrato HU03', () => {
  const error = new AppError('NOT_FOUND', 'No encontrado', { id: 'demo' });
  assert.equal(error.statusCode, 404);
  assert.equal(error.status, 404);
  assert.deepEqual(error.toResponse(), { code: 'NOT_FOUND', message: 'No encontrado', details: { id: 'demo' } });
});
test('conserva constructor de AppError con estado explícito de main', () => {
  const error = new AppError('CUSTOM_RULE', 'Regla', 422, { field: 'demo' });
  assert.equal(error.statusCode, 422);
  assert.equal(error.status, 422);
  assert.deepEqual(error.toResponse(), { code: 'CUSTOM_RULE', message: 'Regla', details: { field: 'demo' } });
});
test('conserva las factories y los dos clientes públicos', () => {
  assert.equal(AppError.notFound().status, 404);
  assert.equal(AppError.serviceUnavailable().status, 503);
  assert.equal(typeof InternalClient, 'function');
  assert.equal(typeof HttpClient, 'function');
  assert.equal(typeof logger.debug, 'function');
});
