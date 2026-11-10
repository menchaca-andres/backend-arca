import request from 'supertest';
jest.mock('../src/data-source', () => ({
  AppDataSource: { isInitialized: false, initialize: jest.fn(), createQueryBuilder: jest.fn() },
}));
import { app } from '../src/app';
import { AppDataSource } from '../src/data-source';

const source = AppDataSource as unknown as {
  isInitialized: boolean;
  initialize: jest.Mock;
  createQueryBuilder: jest.Mock;
};
const query = { select: jest.fn(), from: jest.fn(), limit: jest.fn(), getRawOne: jest.fn() };

describe('Infraestructura: GET /health', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    source.isInitialized = false;
    source.initialize.mockReset().mockImplementation(async () => {
      source.isInitialized = true;
      return source;
    });
    query.select.mockReset().mockReturnValue(query);
    query.from.mockReset().mockReturnValue(query);
    query.limit.mockReset().mockReturnValue(query);
    query.getRawOne.mockReset().mockResolvedValue({ ok: 1 });
    source.createQueryBuilder.mockReset().mockReturnValue(query);
  });
  afterEach(() => jest.restoreAllMocks());

  it('inicializa y consulta PostgreSQL antes de responder 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: expect.any(String), status: 'OK', db: 'up' });
    expect(source.initialize).toHaveBeenCalledTimes(1);
    expect(query.select).toHaveBeenCalledWith('1', 'ok');
    expect(query.from).toHaveBeenCalledWith('pg_catalog.pg_database', 'database');
    expect(query.getRawOne).toHaveBeenCalledTimes(1);
  });
  it('reutiliza el DataSource pero consulta la BD en cada peticion', async () => {
    source.isInitialized = true;
    await request(app).get('/health').expect(200);
    await request(app).get('/health').expect(200);
    expect(source.initialize).not.toHaveBeenCalled();
    expect(query.getRawOne).toHaveBeenCalledTimes(2);
  });
  it('devuelve 503 estandarizado sin filtrar un error de conexion', async () => {
    source.initialize.mockRejectedValueOnce(new Error('postgres://usuario:clave-privada@host/db'));
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Base de datos no disponible',
      details: null,
    });
    expect(JSON.stringify(response.body)).not.toContain('clave-privada');
    expect(query.getRawOne).not.toHaveBeenCalled();
  });
  it('devuelve 503 cuando falla una consulta con el DataSource inicializado', async () => {
    source.isInitialized = true;
    query.getRawOne.mockRejectedValueOnce(new Error('Conexion perdida'));
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
  });
  it('no anuncia salud si la consulta no devuelve el resultado esperado', async () => {
    query.getRawOne.mockResolvedValueOnce(undefined);
    await request(app).get('/health').expect(503);
  });
  it('se recupera despues de una inicializacion fallida', async () => {
    source.initialize.mockRejectedValueOnce(new Error('Temporal'));
    await request(app).get('/health').expect(503);
    await request(app).get('/health').expect(200);
    expect(source.initialize).toHaveBeenCalledTimes(2);
  });
  it('comparte la inicializacion entre peticiones simultaneas', async () => {
    source.initialize.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            source.isInitialized = true;
            resolve(source);
          }, 20);
        }),
    );
    const responses = await Promise.all([request(app).get('/health'), request(app).get('/health')]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(source.initialize).toHaveBeenCalledTimes(1);
    expect(query.getRawOne).toHaveBeenCalledTimes(2);
  });
  it('mantiene /health publico sin clave interna', async () => {
    await request(app).get('/health').expect(200);
  });
});
