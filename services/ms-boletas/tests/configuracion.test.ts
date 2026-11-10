import request from 'supertest';
import { AppError } from '@arca/shared';
import { createApp } from '../src/app';
import { ConfiguracionRepository } from '../src/repositories/configuracion.repository';
import { HttpPersonalClient } from '../src/clients/personal.client';
import { ConfiguracionService } from '../src/services/configuracion.service';
import { crearConceptoSchema, crearNovedadSchema } from '../src/schemas/configuracion.schema';

jest.mock('../src/repositories/configuracion.repository');
jest.mock('../src/clients/personal.client');
const id = '11111111-1111-4111-8111-111111111111';
const identidad = { 'x-user-id': id, 'x-user-rol': 'RRHH' };
const concepto = {
  codigo: 'BONO',
  nombre: 'Bono producción',
  tipo: 'HABER' as const,
  formaCalculo: 'MONTO_FIJO' as const,
  valor: 100,
  base: null,
  automatico: false,
  orden: 1,
};
const novedad = { anio: 2026, mes: 11, funcionarioId: id, conceptoId: id, monto: 125.5, descripcion: 'Producción' };
const { codigo: _codigo, ...edicion } = concepto;
const app = createApp();

describe('HU-20 validaciones', () => {
  it('normaliza el código y acepta monto fijo', () => {
    expect(crearConceptoSchema.parse({ ...concepto, codigo: ' bono ' })).toEqual(concepto);
  });
  it.each([0, 12.71, 100])('acepta porcentaje %s', (valor) => {
    expect(
      crearConceptoSchema.safeParse({ ...concepto, formaCalculo: 'PORCENTAJE', valor, base: 'TOTAL_GANADO' }).success,
    ).toBe(true);
  });
  it.each([
    { valor: 0 },
    { valor: -1 },
    { valor: 1.00001 },
    { valor: 100000000 },
    { formaCalculo: 'PORCENTAJE', valor: 100.0001, base: 'TOTAL_GANADO' },
    { formaCalculo: 'PORCENTAJE', valor: 12.71, base: null },
    { formaCalculo: 'MONTO_FIJO', base: 'HABER_BASICO' },
    { formaCalculo: 'SISTEMA' },
    { esSistema: true },
    { orden: -1 },
    { orden: 32768 },
    { tipo: 'OTRO' },
  ])('rechaza concepto inválido %j', (datos) => {
    expect(crearConceptoSchema.safeParse({ ...concepto, ...datos }).success).toBe(false);
  });
  it.each([{ monto: 0 }, { monto: -1 }, { monto: 1.001 }, { mes: 13 }, { anio: 1800 }, { registradoPor: id }])(
    'rechaza novedad inválida %j',
    (datos) => {
      expect(crearNovedadSchema.safeParse({ ...novedad, ...datos }).success).toBe(false);
    },
  );
});

describe('HU-20 servicio y dependencias', () => {
  beforeEach(() => jest.clearAllMocks());
  it('valida al funcionario por API antes de persistir', async () => {
    const repo = new ConfiguracionRepository();
    const personal = { verificarFuncionario: jest.fn().mockResolvedValue(undefined) };
    await new ConfiguracionService(repo, personal).crearNovedad(novedad, id);
    expect(personal.verificarFuncionario).toHaveBeenCalledWith(id);
    expect(repo.crearNovedad).toHaveBeenCalledWith(novedad, id);
  });
  it.each([AppError.notFound('Funcionario inexistente'), AppError.serviceUnavailable('Personal no disponible')])(
    'no escribe si Personal falla',
    async (error) => {
      const repo = new ConfiguracionRepository();
      const service = new ConfiguracionService(repo, { verificarFuncionario: jest.fn().mockRejectedValue(error) });
      await expect(service.crearNovedad(novedad, id)).rejects.toBe(error);
      expect(repo.crearNovedad).not.toHaveBeenCalled();
    },
  );
});

describe('HU-20 endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(ConfiguracionRepository.prototype, 'listarConceptos').mockResolvedValue([]);
    jest.spyOn(ConfiguracionRepository.prototype, 'crearConcepto').mockResolvedValue({ id, ...concepto } as never);
    jest.spyOn(ConfiguracionRepository.prototype, 'actualizarConcepto').mockResolvedValue({ id, ...concepto } as never);
    jest.spyOn(ConfiguracionRepository.prototype, 'cambiarEstado').mockResolvedValue({ id, activo: false } as never);
    jest.spyOn(ConfiguracionRepository.prototype, 'eliminarConcepto').mockResolvedValue(undefined);
    jest.spyOn(ConfiguracionRepository.prototype, 'listarNovedades').mockResolvedValue([]);
    jest.spyOn(ConfiguracionRepository.prototype, 'crearNovedad').mockResolvedValue({ id, ...novedad } as never);
    jest.spyOn(HttpPersonalClient.prototype, 'verificarFuncionario').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('lista solo activos por defecto y permite incluir inactivos', async () => {
    await request(app).get('/conceptos').set(identidad).expect(200, []);
    expect(ConfiguracionRepository.prototype.listarConceptos).toHaveBeenLastCalledWith(false);
    await request(app).get('/conceptos?incluirInactivos=true').set(identidad).expect(200);
    expect(ConfiguracionRepository.prototype.listarConceptos).toHaveBeenLastCalledWith(true);
    await request(app).get('/conceptos?incluirInactivos=otro').set(identidad).expect(400);
  });
  it('crea un concepto sin permitir atributos de sistema', async () => {
    await request(app).post('/conceptos').set(identidad).send(concepto).expect(201);
    await request(app)
      .post('/conceptos')
      .set(identidad)
      .send({ ...concepto, esSistema: true })
      .expect(400);
  });
  it('edita configuración, cambia estado y elimina', async () => {
    await request(app)
      .patch(`/conceptos/${id}`)
      .set(identidad)
      .send({ ...edicion, valor: 200 })
      .expect(200);
    expect(ConfiguracionRepository.prototype.actualizarConcepto).toHaveBeenCalledWith(id, { ...edicion, valor: 200 });
    await request(app).patch(`/conceptos/${id}/estado`).set(identidad).send({ activo: false }).expect(200);
    await request(app).delete(`/conceptos/${id}`).set(identidad).expect(204);
  });
  it('consulta novedades de un período y funcionario', async () => {
    await request(app).get(`/novedades?anio=2026&mes=11&funcionarioId=${id}`).set(identidad).expect(200, []);
    expect(ConfiguracionRepository.prototype.listarNovedades).toHaveBeenCalledWith({
      anio: 2026,
      mes: 11,
      funcionarioId: id,
    });
    await request(app).get('/novedades?anio=2026&mes=13').set(identidad).expect(400);
  });
  it('registra una novedad con el autor del gateway', async () => {
    await request(app).post('/novedades').set(identidad).send(novedad).expect(201);
    expect(ConfiguracionRepository.prototype.crearNovedad).toHaveBeenCalledWith(novedad, id);
  });
  it.each([
    ['get', '/conceptos'],
    ['post', '/conceptos'],
    ['patch', `/conceptos/${id}`],
    ['patch', `/conceptos/${id}/estado`],
    ['delete', `/conceptos/${id}`],
    ['get', '/novedades?anio=2026&mes=11'],
    ['post', '/novedades'],
  ] as const)('restringe %s %s a RRHH', async (method, path) => {
    await request(app)[method](path).expect(401);
    await request(app)
      [method](path)
      .set({ ...identidad, 'x-user-rol': 'FUNCIONARIO' })
      .expect(403);
  });
  it('rechaza identificadores y entradas inválidas', async () => {
    await request(app).patch('/conceptos/falso').set(identidad).send(edicion).expect(400);
    await request(app)
      .post('/novedades')
      .set({ ...identidad, 'x-user-id': 'falso' })
      .send(novedad)
      .expect(401);
    const res = await request(app)
      .post('/conceptos')
      .set(identidad)
      .send({ ...concepto, valor: 0 })
      .expect(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: expect.any(String),
      details: expect.any(Object),
    });
  });
  it('propaga protección de sistema y referencias usadas', async () => {
    jest
      .spyOn(ConfiguracionRepository.prototype, 'actualizarConcepto')
      .mockRejectedValue(AppError.forbidden('Sistema'));
    await request(app).patch(`/conceptos/${id}`).set(identidad).send(edicion).expect(403);
    jest.spyOn(ConfiguracionRepository.prototype, 'eliminarConcepto').mockRejectedValue(AppError.conflict('Usado'));
    await request(app).delete(`/conceptos/${id}`).set(identidad).expect(409);
  });
  it.each([AppError.conflict('Duplicada'), AppError.notFound('No existe'), AppError.serviceUnavailable('Personal')])(
    'conserva errores comunes',
    async (error) => {
      jest.spyOn(ConfiguracionRepository.prototype, 'crearNovedad').mockRejectedValue(error);
      const res = await request(app).post('/novedades').set(identidad).send(novedad).expect(error.statusCode);
      expect(res.body.code).toBe(error.code);
    },
  );
});
