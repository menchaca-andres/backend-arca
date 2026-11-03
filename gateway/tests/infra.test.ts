import request from 'supertest';
import { createServer, type Server } from 'node:http';
import type { Express } from 'express';

jest.mock('../src/data-source', () => ({ AppDataSource: {} }));
import { createApp } from '../src/app';

const destinations = [
  ['auth', 'AUTH_SERVICE_URL'],
  ['personal', 'PERSONAL_SERVICE_URL'],
  ['vacaciones', 'VACACIONES_SERVICE_URL'],
  ['contratos', 'CONTRATOS_SERVICE_URL'],
  ['boletas', 'BOLETAS_SERVICE_URL'],
] as const;

describe('Infraestructura: gateway', () => {
  const servers: Server[] = [];
  const previousEnvironment: Record<string, string | undefined> = {};
  let app: Express;
  let upstreamRequests = 0;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    for (const [service, environmentKey] of destinations) {
      previousEnvironment[environmentKey] = process.env[environmentKey];
      const server = createServer((req, res) => {
        upstreamRequests++;
        if (req.url === '/unavailable') {
          req.socket.destroy();
          return;
        }
        if (req.url === '/slow') return;
        if (req.url === '/missing') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'No encontrado', details: null }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              service,
              path: req.url,
              method: req.method,
              body: text ? JSON.parse(text) : null,
              requestId: req.headers['x-request-id'],
              userId: req.headers['x-user-id'],
            }),
          );
        });
      });
      servers.push(server);
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Servidor de prueba no disponible');
      process.env[environmentKey] = `http://127.0.0.1:${address.port}`;
    }
    app = createApp();
  });

  afterAll(async () => {
    for (const [, key] of destinations) {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    }
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
            server.closeAllConnections();
          }),
      ),
    );
    jest.restoreAllMocks();
  });

  it.each(destinations)('enruta %s y conserva la query al eliminar el prefijo', async (service) => {
    const response = await request(app).get(`/api/v1/${service}/ping?x=1`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ service, path: '/ping?x=1', method: 'GET' });
  });

  it.each([
    ['auth', 'auth'],
    ['usuarios', 'auth'],
    ['funcionarios', 'personal'],
    ['areas', 'personal'],
    ['cargos', 'personal'],
    ['vacaciones', 'vacaciones'],
    ['contratos', 'contratos'],
    ['plantillas', 'contratos'],
    ['boletas', 'boletas'],
    ['periodos', 'boletas'],
    ['conceptos', 'boletas'],
  ])('conserva la ruta de main /api/%s', async (resource, service) => {
    const response = await request(app).get('/api/' + resource + '/ping?x=1');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ service, path: '/' + resource + '/ping?x=1' });
  });

  it('descarta identidad aportada por el cliente antes del proxy', async () => {
    const response = await request(app).get('/api/v1/personal/ping').set('X-User-Id', 'suplantado');
    expect(response.status).toBe(200);
    expect(response.body.userId).toBeUndefined();
  });

  it('respeta CORS_ORIGIN del equipo', async () => {
    const previous = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN = 'http://localhost:5174';
    try {
      const restricted = createApp();
      const allowed = await request(restricted).get('/api/v1/auth/ping').set('Origin', 'http://localhost:5174');
      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5174');
      const denied = await request(restricted).get('/api/v1/auth/ping').set('Origin', 'http://otro.test');
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGIN;
      else process.env.CORS_ORIGIN = previous;
    }
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('conserva metodo y body JSON: %s', async (method) => {
    const body = { nombres: 'Ejemplo', activo: true };
    const client = request(app);
    const response = await client[method.toLowerCase() as 'post' | 'put' | 'patch' | 'delete'](
      '/api/v1/personal/funcionarios',
    ).send(body);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ service: 'personal', path: '/funcionarios', method, body });
  });

  it('reescribe correctamente una peticion al prefijo raiz con query', async () => {
    const response = await request(app).get('/api/v1/auth?x=1');
    expect(response.status).toBe(200);
    expect(response.body.path).toBe('/?x=1');
  });

  it('propaga un request-id valido', async () => {
    const requestId = '00000000-0000-4000-8000-000000000001';
    const response = await request(app).get('/api/v1/auth/ping').set('X-Request-Id', requestId);
    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it('reemplaza un request-id invalido por un UUID', async () => {
    const response = await request(app).get('/api/v1/auth/ping').set('X-Request-Id', 'invalido');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('devuelve 503 comun si el destino corta la conexion', async () => {
    const response = await request(app).get('/api/v1/personal/unavailable');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'El servicio de destino no esta disponible',
      details: null,
    });
  });

  it('devuelve 503 comun si el destino no responde antes del timeout', async () => {
    const response = await request(app).get('/api/v1/personal/slow');
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('conserva el error HTTP devuelto por el destino', async () => {
    const response = await request(app).get('/api/v1/personal/missing');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it.each([
    '/internal',
    '/internal/stats',
    '/api/v1/auth/internal/usuarios',
    '/api/v1/personal/internal/funcionarios',
    '/api/v1/vacaciones/internal/stats',
    '/api/v1/contratos/internal/stats',
    '/api/v1/boletas/internal/stats',
    '/api/v1/personal/INTERNAL/stats',
    '/api/v1/personal/%69nternal/stats',
    '/api/v1/personal/%2569nternal/stats',
    '/api/v1/personal/%2Finternal%2Fstats',
    '/api/v1/personal/%2e%2e/internal/stats',
  ])('bloquea rutas internas sin alcanzar al destino: %s', async (path) => {
    const before = upstreamRequests;
    const response = await request(app).get(path).set('X-Internal-Key', 'infra-test-key-not-for-deployment');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(upstreamRequests).toBe(before);
  });

  it('bloquea rutas internas sin clave', async () => {
    const response = await request(app).get('/internal/stats');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('rechaza una codificacion invalida', async () => {
    const response = await request(app).get('/api/v1/personal/%ZZ');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('no bloquea una query que solo menciona /internal', async () => {
    const response = await request(app).get('/api/v1/personal/funcionarios').query({ referencia: '/internal/stats' });
    expect(response.status).toBe(200);
    expect(new URL(response.body.path, 'http://upstream.test').searchParams.get('referencia')).toBe('/internal/stats');
  });

  it('devuelve 404 comun para prefijos desconocidos', async () => {
    const response = await request(app).get('/api/v1/desconocido/ping');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'NOT_FOUND', message: 'Ruta no encontrada', details: null });
  });
});
