import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { BoletaController } from '../controllers/boleta.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { rectificarBoletaSchema } from '../schemas/boleta.schema';

export const boletaRouter = Router();
const controller = new BoletaController();

// Obtener boleta por ID (RRHH, ADMIN, DIRECCION, FUNCIONARIO)
boletaRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  controller.obtenerPorId,
);

// Rectificar boleta emitida (HU-22 CA-05 y CA-06) (RRHH, ADMIN)
boletaRouter.post(
  '/:id/rectificacion',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(rectificarBoletaSchema),
  controller.rectificar,
);
