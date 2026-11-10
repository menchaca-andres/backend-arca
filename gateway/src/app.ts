import 'dotenv/config';
import express, { type Request, type RequestHandler, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { ServerResponse } from 'node:http';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { AppError, createLogger, errorHandler } from '@arca/shared';
import { jwtAuth } from './middlewares/auth.middleware';
import { createHealthRouter } from './routes/health.routes';

const IDENTITY_HEADERS = ['x-user-id', 'x-user-rol', 'x-user-role', 'x-funcionario-id'];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const blockInternalAccess: RequestHandler = (req, _res, next) => {
  let path = req.originalUrl.split('?')[0];
  for (let attempt = 0; attempt < 5; attempt++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      next(new AppError('VALIDATION_ERROR', 'Ruta invalida'));
      return;
    }
    if (decoded === path) {
      const segments = decoded
        .replace(/\\/g, '/')
        .split(/[/?#]/)
        .map((segment) => segment.split(';')[0].toLowerCase());
      if (segments.includes('internal')) {
        next(new AppError('FORBIDDEN', 'Las rutas internas no estan disponibles desde el gateway'));
        return;
      }
      next();
      return;
    }
    path = decoded;
  }
  next(new AppError('VALIDATION_ERROR', 'La ruta contiene demasiados niveles de codificacion'));
};

export function createApp() {
  const app = express();
  const logger = createLogger('gateway');
  app.disable('x-powered-by');
  const configuredOrigins = process.env.CORS_ORIGIN?.trim();
  app.use(
    cors({
      origin:
        !configuredOrigins || configuredOrigins === '*'
          ? true
          : configuredOrigins
              .split(',')
              .map((origin) => origin.trim())
              .filter(Boolean),
    }),
  );
  app.use((req, res, next) => {
    const incoming = req.get('X-Request-Id');
    const requestId = incoming && uuidPattern.test(incoming) ? incoming : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.once('finish', () => {
      const context = { method: req.method, statusCode: res.statusCode, requestId };
      if (res.statusCode >= 500) logger.warn('http.response', context);
      else logger.info('http.response', context);
    });
    next();
  });
  // Bloquear antes de los proxies y del procesamiento del body.
  app.use(blockInternalAccess);
  // La identidad solo la pone el gateway: se descarta la que mande el cliente y se toma del JWT.
  app.use((req, _res, next) => {
    for (const header of IDENTITY_HEADERS) delete req.headers[header];
    next();
  });
  app.use(jwtAuth());
  app.use(express.json());
  app.use('/health', createHealthRouter('gateway'));

  const routes: Array<{ prefix: string; target: string; forwardedPrefix?: string }> = [
    {
      prefix: '/api/v1/auth',
      target: process.env.AUTH_SERVICE_URL ?? 'http://ms-auth:3001',
      forwardedPrefix: '/auth',
    },
    { prefix: '/api/v1/personal', target: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002' },
    { prefix: '/api/v1/vacaciones', target: process.env.VACACIONES_SERVICE_URL ?? 'http://ms-vacaciones:3003' },
    { prefix: '/api/v1/contratos', target: process.env.CONTRATOS_SERVICE_URL ?? 'http://ms-contratos:3004' },
    { prefix: '/api/v1/boletas', target: process.env.BOLETAS_SERVICE_URL ?? 'http://ms-boletas:3005' },
    { prefix: '/api/auth', target: process.env.AUTH_SERVICE_URL ?? 'http://ms-auth:3001', forwardedPrefix: '/auth' },
    {
      prefix: '/api/usuarios',
      target: process.env.AUTH_SERVICE_URL ?? 'http://ms-auth:3001',
      forwardedPrefix: '/usuarios',
    },
    {
      prefix: '/api/funcionarios',
      target: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
      forwardedPrefix: '/funcionarios',
    },
    {
      prefix: '/api/areas',
      target: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
      forwardedPrefix: '/areas',
    },
    {
      prefix: '/api/cargos',
      target: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
      forwardedPrefix: '/cargos',
    },
    {
      prefix: '/api/vacaciones',
      target: process.env.VACACIONES_SERVICE_URL ?? 'http://ms-vacaciones:3003',
      forwardedPrefix: '/vacaciones',
    },
    {
      prefix: '/api/contratos',
      target: process.env.CONTRATOS_SERVICE_URL ?? 'http://ms-contratos:3004',
      forwardedPrefix: '/contratos',
    },
    {
      prefix: '/api/plantillas',
      target: process.env.CONTRATOS_SERVICE_URL ?? 'http://ms-contratos:3004',
      forwardedPrefix: '/plantillas',
    },
    {
      prefix: '/api/boletas',
      target: process.env.BOLETAS_SERVICE_URL ?? 'http://ms-boletas:3005',
      forwardedPrefix: '/boletas',
    },
    {
      prefix: '/api/periodos',
      target: process.env.BOLETAS_SERVICE_URL ?? 'http://ms-boletas:3005',
      forwardedPrefix: '/periodos',
    },
    {
      prefix: '/api/conceptos',
      target: process.env.BOLETAS_SERVICE_URL ?? 'http://ms-boletas:3005',
      forwardedPrefix: '/conceptos',
    },
  ];
  for (const { prefix, target, forwardedPrefix } of routes) {
    app.use(
      prefix,
      createProxyMiddleware<Request, Response>({
        target,
        changeOrigin: true,
        xfwd: true,
        proxyTimeout: 3000,
        // Permitir responder el 503 antes de cerrar el socket del cliente.
        timeout: 5000,
        pathRewrite: (_path, req) => {
          const suffix = req.originalUrl.slice(prefix.length);
          return forwardedPrefix ? forwardedPrefix + suffix : !suffix || suffix.startsWith('?') ? `/${suffix}` : suffix;
        },
        on: {
          proxyReq: (proxyReq, req) => {
            proxyReq.setHeader('X-Request-Id', String(req.headers['x-request-id']));
            fixRequestBody(proxyReq, req);
          },
          error: (_error, req, res) => {
            logger.warn('proxy.unavailable', { prefix, requestId: req.headers['x-request-id'] });
            if (!(res instanceof ServerResponse)) {
              res.destroy();
              return;
            }
            if (res.headersSent) {
              res.destroy();
              return;
            }
            const error = new AppError('SERVICE_UNAVAILABLE', 'El servicio de destino no esta disponible');
            res.writeHead(error.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(error.toResponse()));
          },
        },
      }),
    );
  }
  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND', 'Ruta no encontrada'));
  });
  app.use(errorHandler);
  return app;
}

export const app = createApp();
