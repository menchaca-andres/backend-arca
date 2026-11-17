import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { DashboardController } from '../controllers/dashboard.controller';

export function createDashboardRouter(controller: DashboardController = new DashboardController()): Router {
  const router = Router();

  // CA-06: Solo DIRECCION, RRHH y ADMIN ven el dashboard
  router.use(requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION));

  router.get('/', controller.obtenerDashboard);

  return router;
}
