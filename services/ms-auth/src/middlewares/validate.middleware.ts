import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '@arca/shared';

/**
 * Valida req.body con un schema Zod y deja el resultado tipado en req.body.
 * Si falla, responde con el formato común { code, message, details }.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(AppError.badRequest('Datos inválidos', result.error.issues));
      return;
    }

    req.body = result.data;
    next();
  };
}
