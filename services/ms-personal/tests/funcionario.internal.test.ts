import express from 'express';
import request from 'supertest';
import { errorHandler, EstadoFuncionario } from '@arca/shared';
import { FuncionarioInternalController } from '../src/controllers/funcionario.internal.controller';
import { createFuncionarioInternalRouter } from '../src/routes/funcionario.internal.routes';

const FUNCIONARIO_ID = '11111111-1111-4111-8111-111111111103';

describe('GET /internal/funcionarios/:id', () => {
  const service = {
    obtenerContratoInterno: jest.fn().mockResolvedValue({
      id: FUNCIONARIO_ID,
      usuarioId: null,
      nombres: 'Daniela',
      apellidos: 'Mendoza Vargas',
      documentoIdentidad: '9000003',
      fechaIngreso: '2020-03-10',
      diasPrueba: 90,
      fechaRatificacion: '2020-06-08',
      fechaBaja: null,
      area: 'Administración',
      cargo: 'Analista',
      remuneracion: { monto: 5000, moneda: 'BOB' },
      estado: EstadoFuncionario.RATIFICADO,
    }),
    listarContratosInterno: jest.fn(),
  };
  const app = express();
  app.use(createFuncionarioInternalRouter(new FuncionarioInternalController(service)));
  app.use(errorHandler);

  beforeEach(() => service.obtenerContratoInterno.mockClear());

  it('devuelve los datos de Personal requeridos para calcular elegibilidad', async () => {
    const response = await request(app).get(`/funcionarios/${FUNCIONARIO_ID}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: FUNCIONARIO_ID,
      fechaIngreso: '2020-03-10',
      estado: EstadoFuncionario.RATIFICADO,
    });
    expect(service.obtenerContratoInterno).toHaveBeenCalledWith(FUNCIONARIO_ID);
  });

  it('rechaza un identificador inválido con el error común', async () => {
    const response = await request(app).get('/funcionarios/no-es-uuid');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', details: null });
    expect(service.obtenerContratoInterno).not.toHaveBeenCalled();
  });
});

describe('GET /internal/funcionarios (HU-09 CA-05)', () => {
  const pagina = { data: [], page: 1, pageSize: 100, total: 0 };
  const service = {
    obtenerContratoInterno: jest.fn(),
    listarContratosInterno: jest.fn().mockResolvedValue(pagina),
  };
  const app = express();
  app.use(createFuncionarioInternalRouter(new FuncionarioInternalController(service)));
  app.use(errorHandler);

  beforeEach(() => service.listarContratosInterno.mockClear());

  it('lista por estado y rango de actividad con paginación por defecto', async () => {
    const response = await request(app).get(
      '/funcionarios?estado=RATIFICADO&activosDesde=2026-11-01&activosHasta=2026-11-30',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(pagina);
    expect(service.listarContratosInterno).toHaveBeenCalledWith({
      estado: EstadoFuncionario.RATIFICADO,
      activosDesde: '2026-11-01',
      activosHasta: '2026-11-30',
      page: 1,
      pageSize: 100,
    });
  });

  it.each([
    ['un estado desconocido', '/funcionarios?estado=ACTIVO'],
    ['un rango invertido', '/funcionarios?activosDesde=2026-12-01&activosHasta=2026-11-01'],
    ['un pageSize mayor a 200', '/funcionarios?pageSize=500'],
  ])('rechaza %s', async (_caso, url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(service.listarContratosInterno).not.toHaveBeenCalled();
  });
});
