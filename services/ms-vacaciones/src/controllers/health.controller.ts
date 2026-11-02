import type { RequestHandler } from 'express';
import { checkHealth } from '../services/health.service';

export function healthController(serviceName: string): RequestHandler {
  return async (_req, res, next) => {
    try {
      await checkHealth();
      res.status(200).json({ service: serviceName, status: 'OK' });
    } catch (error) {
      next(error);
    }
  };
}
