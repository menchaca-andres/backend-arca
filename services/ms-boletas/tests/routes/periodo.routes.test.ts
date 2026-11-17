import request from 'supertest';
import { createApp } from '../../src/app';
import { PeriodoService } from '../../src/services/periodo.service';
import { EstadoPeriodo, RolUsuario } from '@arca/shared';

describe('HU-21: Rutas de Períodos y Planilla (POST /periodos y POST /periodos/:id/calculo)', () => {
  const rrhhHeaders = {
    'x-user-id': 'u-rrhh-1',
    'x-user-rol': RolUsuario.RRHH,
  };

  const funcionarioHeaders = {
    'x-user-id': 'u-func-1',
    'x-user-rol': RolUsuario.FUNCIONARIO,
  };

  describe('POST /periodos (CA-01)', () => {
    it('rechaza 401 si no hay identidad de usuario', async () => {
      const app = createApp();
      const res = await request(app).post('/periodos').send({ anio: 2026, mes: 11 });
      expect(res.status).toBe(401);
    });

    it('rechaza 403 si el rol no es RRHH ni ADMIN (ej. FUNCIONARIO)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/periodos')
        .set(funcionarioHeaders)
        .send({ anio: 2026, mes: 11 });
      expect(res.status).toBe(403);
    });

    it('rechaza 400 si los parámetros no cumplen el schema Zod', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/periodos')
        .set(rrhhHeaders)
        .send({ anio: 1990, mes: 13 }); // Inválidos
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('responde 201 y crea el período si los datos son válidos', async () => {
      const mockPeriodo = {
        id: 'p-2026-11',
        anio: 2026,
        mes: 11,
        estado: EstadoPeriodo.BORRADOR,
        fechaCalculo: null,
        fechaEmision: null,
        emitidoPor: null,
      };

      jest.spyOn(PeriodoService.prototype, 'abrir').mockResolvedValue(mockPeriodo as any);

      const app = createApp();
      const res = await request(app)
        .post('/periodos')
        .set(rrhhHeaders)
        .send({ anio: 2026, mes: 11 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('p-2026-11');
      expect(res.body.estado).toBe(EstadoPeriodo.BORRADOR);
    });
  });

  describe('POST /periodos/:id/calculo (CA-02 a CA-07)', () => {
    it('rechaza 403 si el rol es FUNCIONARIO', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/periodos/p-1/calculo')
        .set(funcionarioHeaders);
      expect(res.status).toBe(403);
    });

    it('responde 200 con el resumen de la planilla calculada', async () => {
      const mockResultado = {
        periodo: { id: 'p-1', anio: 2026, mes: 10, estado: EstadoPeriodo.BORRADOR } as any,
        resumen: {
          totalGanado: 24700,
          totalDescuentos: 3139.37,
          totalLiquido: 21560.63,
          cantidadBoletas: 3,
          cantidadAlertas: 0,
        },
        boletas: [],
      };

      jest.spyOn(PeriodoService.prototype, 'calcular').mockResolvedValue(mockResultado);

      const app = createApp();
      const res = await request(app)
        .post('/periodos/p-1/calculo')
        .set(rrhhHeaders);

      expect(res.status).toBe(200);
      expect(res.body.resumen.totalGanado).toBe(24700);
      expect(res.body.resumen.cantidadBoletas).toBe(3);
    });
  });

  describe('GET /periodos/:id (CA-08)', () => {
    it('responde 200 con el detalle de la planilla', async () => {
      const mockResultado = {
        periodo: { id: 'p-1', anio: 2026, mes: 10, estado: EstadoPeriodo.BORRADOR } as any,
        resumen: {
          totalGanado: 24700,
          totalDescuentos: 3139.37,
          totalLiquido: 21560.63,
          cantidadBoletas: 3,
          cantidadAlertas: 0,
        },
        boletas: [],
      };

      jest.spyOn(PeriodoService.prototype, 'obtenerPorId').mockResolvedValue(mockResultado);

      const app = createApp();
      const res = await request(app)
        .get('/periodos/p-1')
        .set(rrhhHeaders);

      expect(res.status).toBe(200);
      expect(res.body.periodo.id).toBe('p-1');
      expect(res.body.resumen.totalLiquido).toBe(21560.63);
    });
  });
});
