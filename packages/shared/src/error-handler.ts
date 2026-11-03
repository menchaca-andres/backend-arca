import type { ErrorRequestHandler } from 'express';
import { AppError } from './errors';
import { logger } from './logger';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json(error.toResponse());
    return;
  }
  // Tambien se pueden lanzar strings u objetos con datos sensibles.
  logger.error('Unhandled request error', { errorType: error instanceof Error ? error.name : typeof error });
  res.status(500).json(new AppError('INTERNAL_ERROR', 'Error interno del servidor').toResponse());
};
