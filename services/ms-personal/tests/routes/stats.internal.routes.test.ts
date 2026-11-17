import request from 'supertest';
import { createApp } from '../../src/app';
import { FuncionarioService } from '../../src/services/funcionario.service';

describe('HU-25: GET /internal/stats en ms-personal (CA-05)', () => {
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

  it('responde 200 con estadísticas de personal cuando la clave es correcta', async () => {
    const mockStats = {
      activos: 10,
      enPrueba: 2,
      bajasMes: 1,
      funcionariosPorArea: [{ area: 'Tecnología', cantidad: 5 }],
      periodosPruebaPorVencer: [],
      cumplenGestionMes: [],
    };

    jest.spyOn(FuncionarioService.prototype, 'obtenerEstadisticas').mockResolvedValue(mockStats as any);

    const app = createApp();
    const res = await request(app).get('/internal/stats').set(headersValidos);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockStats);
  });
});
