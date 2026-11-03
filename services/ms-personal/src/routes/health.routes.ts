import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

export function createHealthRouter(serviceName: string): Router {
  const router = Router();
  router.get('/', healthController(serviceName));
  return router;
}
