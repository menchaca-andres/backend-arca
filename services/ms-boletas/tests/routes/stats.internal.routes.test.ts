import request from 'supertest';
import { createApp } from '../../src/app';
import { PeriodoService } from '../../src/services/periodo.service';

describe('HU-25: GET /internal/stats en ms-boletas (CA-05)', () => {
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

  it('responde 200 con estadísticas de masa salarial cuando la clave es correcta', async () => {
    const mockStats = {
      masaSalarialUltimoPeriodo: {
        periodoId: 'p-1',
        anio: 2026,
        mes: 11,
        periodoNombre: '11/2026',
        monto: 75000.5,
        moneda: 'BOB',
        totalBoletas: 12,
      },
      historialMasaSalarial: [
        {
          periodoId: 'p-1',
          anio: 2026,
          mes: 11,
          periodoNombre: '11/2026',
          masaSalarial: 75000.5,
          liquidoTotal: 65000.0,
          totalBoletas: 12,
        },
      ],
    };

    jest.spyOn(PeriodoService.prototype, 'obtenerEstadisticas').mockResolvedValue(mockStats as any);

    const app = createApp();
    const res = await request(app).get('/internal/stats').set(headersValidos);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockStats);
  });
});
