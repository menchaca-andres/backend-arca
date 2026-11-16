import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { PeriodoController } from '../controllers/periodo.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { abrirPeriodoSchema } from '../schemas/periodo.schema';

export const periodoRouter = Router();
const controller = new PeriodoController();

// Listar períodos (RRHH, ADMIN, DIRECCION)
periodoRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.listar,
);

// Obtener período y planilla por ID (RRHH, ADMIN, DIRECCION)
periodoRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.obtenerPorId,
);

// Abrir nuevo período (RRHH, ADMIN)
periodoRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(abrirPeriodoSchema),
  controller.abrir,
);

// Calcular o recalcular planilla del período (RRHH, ADMIN)
periodoRouter.post(
  '/:id/calculo',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  controller.calcular,
);

// Emitir boletas inmutables del período (HU-22 CA-01 a CA-03) (RRHH, ADMIN)
periodoRouter.post(
  '/:id/emision',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  controller.emitir,
);
