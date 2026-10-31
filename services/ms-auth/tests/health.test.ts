import request from 'supertest';
import { app } from '../src/app';

describe('GET /health', () => {
  it('responde OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ service: 'ms-auth', status: 'OK' });
  });
});
