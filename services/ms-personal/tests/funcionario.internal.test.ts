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
