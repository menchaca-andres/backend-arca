import request from 'supertest';
import { Router, type Express } from 'express';
jest.mock('../src/data-source', () => ({ AppDataSource: {} }));
import { createApp } from '../src/app';

describe('Infraestructura: proteccion de /internal', () => {
  let app: Express;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const router = Router();
    // Endpoint exclusivo del test; no se agrega a la aplicacion productiva.
    router.get('/probe', (_req, res) => { res.json({ allowed: true }); });
    app = createApp(router);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['/internal', '/internal/probe', '/internal/desconocida'])(
    'rechaza sin clave antes de resolver la ruta: %s', async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 'UNAUTHORIZED', message: 'Clave interna ausente o invalida', details: null,
      });
    },
  );
  it('rechaza una clave incorrecta', async () => {
    const response = await request(app).get('/internal/probe').set('X-Internal-Key', 'incorrecta');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });
  it('permite la clave correcta', async () => {
    const response = await request(app).get('/internal/probe')
      .set('X-Internal-Key', 'infra-test-key-not-for-deployment');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ allowed: true });
  });
  it('valida la clave antes de interpretar un body JSON malformado', async () => {
    const response = await request(app).post('/internal/probe')
      .set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });
});
