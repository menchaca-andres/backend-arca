import request from 'supertest';
import { app } from '../src/app';
import { usarBase } from './helpers/db';

describe('GET /health', () => {
  usarBase();

  it('responde OK cuando la base esta conectada', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: 'ms-personal', status: 'OK', db: 'up' });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('responde 404 con el formato comun de error', async () => {
    const res = await request(app).get('/ruta-inexistente');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('details');
  });
});
