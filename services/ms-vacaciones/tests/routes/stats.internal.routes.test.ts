import request from 'supertest';
import { createApp } from '../../src/app';
import { VacacionesService } from '../../src/services/vacaciones.service';

describe('HU-25: GET /internal/stats en ms-vacaciones (CA-05)', () => {
  const apiKey = process.env.INTERNAL_API_KEY || 'test-key-not-for-deployment';
  const headersValidos = { 'x-internal-key': apiKey };

  it('rechaza con 401 si falta x-internal-key', async () => {
    const app = createApp();
    const res = await request(app).get('/internal/stats');
    expect(res.status).toBe(401);
  });

  it('rechaza con 401 si x-internal-key es inválida', async () => {
    const app = createApp();
    const res = await request(app).get('/internal/stats').set('x-internal-key', 'clave-falsa');
    expect(res.status).toBe(401);
  });

  it('responde 200 con estadísticas de vacaciones cuando la clave es correcta', async () => {
    const mockStats = {
      solicitudesPendientes: 3,
      alertas: [
        {
          id: 'v-1',
          funcionarioId: 'f-1',
          funcionarioNombre: 'Juan Perez',
          diasHabiles: 5,
          fechaInicio: '2026-12-01',
          fechaFin: '2026-12-07',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    jest.spyOn(VacacionesService.prototype, 'obtenerEstadisticas').mockResolvedValue(mockStats as any);

    const app = createApp();
    const res = await request(app).get('/internal/stats').set(headersValidos);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockStats);
  });
});
