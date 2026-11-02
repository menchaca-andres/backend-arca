import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logger } from './logger';

export interface ErrorResponse {
  code: string;
  message: string;
  details: unknown | null;
}

/**
 * Error de negocio con el formato común del proyecto: { code, message, details }.
 * Los controllers/services lanzan AppError; el errorHandler lo traduce a HTTP.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown | null;

  constructor(code: string, message: string, status = 500, details: unknown = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Solicitud inválida', details: unknown = null): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  static unauthorized(message = 'No autenticado', details: unknown = null): AppError {
    return new AppError('UNAUTHORIZED', message, 401, details);
  }

  static forbidden(message = 'No tiene permiso para esta operación', details: unknown = null): AppError {
    return new AppError('FORBIDDEN', message, 403, details);
  }

  static notFound(message = 'Recurso no encontrado', details: unknown = null): AppError {
    return new AppError('NOT_FOUND', message, 404, details);
  }

  static conflict(message = 'El recurso ya existe o entra en conflicto', details: unknown = null): AppError {
    return new AppError('CONFLICT', message, 409, details);
  }

  static serviceUnavailable(message = 'Servicio no disponible', details: unknown = null): AppError {
    return new AppError('SERVICE_UNAVAILABLE', message, 503, details);
  }

  static internal(message = 'Error interno del servidor', details: unknown = null): AppError {
    return new AppError('INTERNAL_ERROR', message, 500, details);
  }
}

/** Atrapa promesas rechazadas en rutas async de Express 4. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.path}`));
}

/**
 * Middleware final de errores. Debe registrarse después de todas las rutas.
 * Los errores no controlados no filtran stack ni mensaje interno al cliente.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  const appError = error instanceof AppError ? error : null;
  const status = appError?.status ?? 500;
  const body: ErrorResponse = {
    code: appError?.code ?? 'INTERNAL_ERROR',
    message: appError?.message ?? 'Error interno del servidor',
    details: appError?.details ?? null,
  };

  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
  if (status >= 500) {
    logger.error('Error no controlado', { requestId, path: req.originalUrl, error });
  } else {
    logger.warn('Solicitud rechazada', {
      requestId,
      path: req.originalUrl,
      code: body.code,
      message: body.message,
    });
  }

  res.status(status).json(body);
}
