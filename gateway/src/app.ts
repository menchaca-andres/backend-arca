import 'dotenv/config';
import express, { type Request, type RequestHandler, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { ServerResponse } from 'node:http';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { AppError, createLogger, errorHandler } from '@arca/shared';
import { createHealthRouter } from './routes/health.routes';

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
      const segments = decoded.replace(/\\/g, '/').split(/[/?#]/)
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
  app.use(cors());
  app.use((req, res, next) => {
    const incoming = req.get('X-Request-Id');
    const requestId = incoming && uuidPattern.test(incoming) ? incoming : randomUUID();
    req.headers['x-request-id'] = requestId;
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
  app.use(express.json());
  app.use('/health', createHealthRouter('gateway'));

  const routes = [
    { prefix: '/api/v1/auth', target: process.env.AUTH_SERVICE_URL ?? 'http://ms-auth:3001' },
    { prefix: '/api/v1/personal', target: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002' },
    { prefix: '/api/v1/vacaciones', target: process.env.VACACIONES_SERVICE_URL ?? 'http://ms-vacaciones:3003' },
    { prefix: '/api/v1/contratos', target: process.env.CONTRATOS_SERVICE_URL ?? 'http://ms-contratos:3004' },
    { prefix: '/api/v1/boletas', target: process.env.BOLETAS_SERVICE_URL ?? 'http://ms-boletas:3005' },
  ];
  for (const { prefix, target } of routes) {
    app.use(prefix, createProxyMiddleware<Request, Response>({
      target,
      changeOrigin: true,
      proxyTimeout: 3000,
      // Permitir responder el 503 antes de cerrar el socket del cliente.
      timeout: 5000,
      pathRewrite: (_path, req) => {
        const suffix = req.originalUrl.slice(prefix.length);
        return !suffix || suffix.startsWith('?') ? `/${suffix}` : suffix;
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
    }));
  }
  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND', 'Ruta no encontrada'));
  });
  app.use(errorHandler);
  return app;
}

export const app = createApp();
