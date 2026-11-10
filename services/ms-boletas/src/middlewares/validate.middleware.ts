import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '@arca/shared';

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

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(AppError.badRequest('Parámetros inválidos', result.error.issues));
      return;
    }

    res.locals.query = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      next(AppError.badRequest('Parámetros inválidos', result.error.issues));
      return;
    }

    res.locals.params = result.data;
    next();
  };
}

