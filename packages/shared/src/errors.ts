import type { Request, Response, NextFunction, RequestHandler } from 'express';
export const errorStatus = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof errorStatus;

export interface ErrorResponse {
  code: string;
  message: string;
  details: unknown | null;
}

// Solo usar mensajes y detalles que sea seguro devolver al cliente.
export class AppError extends Error {
  readonly statusCode: number;
  readonly status: number;
  readonly code: string;
  readonly details: unknown | null;
  constructor(code: string, message: string, detailsOrStatus: unknown = null, details: unknown = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = typeof detailsOrStatus === 'number' ? detailsOrStatus : (errorStatus[code as ErrorCode] ?? 500);
    this.status = this.statusCode;
    this.details = typeof detailsOrStatus === 'number' ? details : detailsOrStatus;
  }
  toResponse(): ErrorResponse {
    return { code: this.code, message: this.message, details: this.details };
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
