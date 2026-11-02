import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { AppError } from './errors';

export function requireInternalKey(expectedKey: string): RequestHandler {
  if (!expectedKey || !expectedKey.trim()) {
    throw new Error('INTERNAL_API_KEY debe estar configurada');
  }
  const expected = Buffer.from(expectedKey);
  return (req, _res, next) => {
    const header = req.headers['x-internal-key'];
    const received = typeof header === 'string' ? Buffer.from(header) : Buffer.alloc(0);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      next(new AppError('UNAUTHORIZED', 'Clave interna ausente o invalida'));
      return;
    }
    next();
  };
}
