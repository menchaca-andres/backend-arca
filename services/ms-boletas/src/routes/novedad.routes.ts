import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { NovedadController } from '../controllers/novedad.controller';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import { listarNovedadesQuerySchema, registrarNovedadSchema } from '../schemas/novedad.schema';

export const novedadRouter = Router();
const controller = new NovedadController();

// Listar novedades (RRHH, ADMIN, DIRECCION)
novedadRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  validateQuery(listarNovedadesQuerySchema),
  controller.listar,
);

// Obtener novedad por ID (RRHH, ADMIN, DIRECCION)
novedadRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.obtenerPorId,
);

// Registrar novedad (RRHH, ADMIN)
novedadRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(registrarNovedadSchema),
  controller.registrar,
);

// Eliminar novedad (RRHH, ADMIN)
novedadRouter.delete('/:id', requireRole(RolUsuario.ADMIN, RolUsuario.RRHH), controller.eliminar);
