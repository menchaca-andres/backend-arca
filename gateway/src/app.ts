import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request } from 'express';
import { AppError, HEADERS, errorHandler, healthHandler, logger, notFoundHandler, requestId } from '@arca/shared';
import { AppDataSource } from './data-source';
import { jwtAuth } from './middlewares/auth.middleware';

const SERVICE_URLS = {
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  personal: process.env.PERSONAL_SERVICE_URL ?? 'http://localhost:3002',
  vacaciones: process.env.VACACIONES_SERVICE_URL ?? 'http://localhost:3003',
  contratos: process.env.CONTRATOS_SERVICE_URL ?? 'http://localhost:3004',
  boletas: process.env.BOLETAS_SERVICE_URL ?? 'http://localhost:3005',
} as const;

// El gateway monta el proxy en /api y Express quita ese prefijo antes de reenviar.
// Por eso el servicio recibe /auth/login, /funcionarios, /vacaciones, etc.
const ROUTES: ReadonlyArray<{ pattern: RegExp; target: string }> = [
  { pattern: /^\/api\/auth(\/|$)/, target: SERVICE_URLS.auth },
  { pattern: /^\/api\/usuarios(\/|$)/, target: SERVICE_URLS.auth },
  { pattern: /^\/api\/funcionarios(\/|$)/, target: SERVICE_URLS.personal },
  { pattern: /^\/api\/areas(\/|$)/, target: SERVICE_URLS.personal },
  { pattern: /^\/api\/cargos(\/|$)/, target: SERVICE_URLS.personal },
  { pattern: /^\/api\/vacaciones(\/|$)/, target: SERVICE_URLS.vacaciones },
  { pattern: /^\/api\/contratos(\/|$)/, target: SERVICE_URLS.contratos },
  { pattern: /^\/api\/plantillas(\/|$)/, target: SERVICE_URLS.contratos },
  { pattern: /^\/api\/boletas(\/|$)/, target: SERVICE_URLS.boletas },
  { pattern: /^\/api\/periodos(\/|$)/, target: SERVICE_URLS.boletas },
  { pattern: /^\/api\/conceptos(\/|$)/, target: SERVICE_URLS.boletas },
];

function targetFor(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return ROUTES.find((route) => route.pattern.test(url))?.target;
}

function corsOrigin(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') return true;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const app = express();

app.disable('x-powered-by');
app.use(requestId);
app.use(cors({ origin: corsOrigin() }));

// La identidad solo la puede inyectar el gateway; se descarta la del cliente.
app.use((req, _res, next) => {
  delete req.headers[HEADERS.userId];
  delete req.headers[HEADERS.userRole];
  delete req.headers[HEADERS.funcionarioId];
  next();
});

app.use(jwtAuth());

app.get('/health', healthHandler({ service: 'gateway', dataSource: AppDataSource }));

// Una ruta /api que no pertenece a ningún servicio devuelve 404 con el formato común.
app.use('/api', (req, _res, next) => {
  if (!targetFor(req.originalUrl)) {
    next(AppError.notFound(`No hay un servicio configurado para ${req.method} ${req.originalUrl}`));
    return;
  }
  next();
});

app.use(
  '/api',
  createProxyMiddleware({
    target: SERVICE_URLS.personal,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 10_000,
    timeout: 10_000,
    router: (req) => targetFor((req as Request).originalUrl) ?? SERVICE_URLS.personal,
    on: {
      proxyReq: (proxyReq, _req, res) => {
        const response = res as express.Response;
        const id = typeof response.locals?.requestId === 'string' ? response.locals.requestId : undefined;
        if (id) proxyReq.setHeader('x-request-id', id);
      },
      error: (error, req, res) => {
        logger.error('Error en el proxy del gateway', {
          path: (req as Request).originalUrl,
          error,
        });

        const response = res as express.Response;
        if (response && 'writeHead' in response && !response.headersSent) {
          response.status(503).json({
            code: 'SERVICE_UNAVAILABLE',
            message: 'El servicio no está disponible',
            details: null,
          });
        }
      },
    },
  }),
);

app.use(express.json());
app.use(notFoundHandler);
app.use(errorHandler);
