import 'dotenv/config';
import express, { Router } from 'express';
import cors from 'cors';
import {
  AppError,
  createLogger,
  errorHandler,
  requestId,
  requireInternalKey as internalKeyMiddleware,
} from '@arca/shared';
import { createHealthRouter } from './routes/health.routes';
import { areaRouter } from './routes/area.routes';
import { cargoRouter } from './routes/cargo.routes';
import { funcionarioRouter, internalFuncionarioRouter } from './routes/funcionario.routes';

const SERVICE_NAME = 'ms-personal';

export function createApp(customInternalRoutes?: Router) {
  const app = express();
  const logger = createLogger(SERVICE_NAME);
  const protectInternal = internalKeyMiddleware(process.env.INTERNAL_API_KEY ?? '');

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(cors());
  app.use((req, res, next) => {
    res.once('finish', () => {
      const context = { method: req.method, statusCode: res.statusCode };
      if (res.statusCode >= 500) logger.warn('http.response', context);
      else logger.info('http.response', context);
    });
    next();
  });

  // La clave se valida antes de interpretar el body o resolver la ruta.
  app.use('/internal', protectInternal);
  app.use(express.json());
  app.use('/health', createHealthRouter(SERVICE_NAME));

  // Rutas internas protegidas con clave
  const internalRouter = Router();
  internalRouter.use(internalFuncionarioRouter);
  if (customInternalRoutes) {
    internalRouter.use(customInternalRoutes);
  }
  app.use('/internal', internalRouter);

  app.use('/areas', areaRouter);
  app.use('/cargos', cargoRouter);
  app.use('/funcionarios', funcionarioRouter);

  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND', 'Ruta no encontrada'));
  });
  app.use(errorHandler);
  return app;
}

export const app = createApp();
