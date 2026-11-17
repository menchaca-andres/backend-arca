import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { BoletaController } from '../controllers/boleta.controller';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import { listarBoletasQuerySchema, rectificarBoletaSchema } from '../schemas/boleta.schema';

export const boletaRouter = Router();
const controller = new BoletaController();

// HU-23 CA-01 y CA-02: Listar boletas con filtros y totales (RRHH, ADMIN, DIRECCION, FUNCIONARIO)
boletaRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  validateQuery(listarBoletasQuerySchema),
  controller.listar,
);

// HU-23 CA-03: Obtener boleta por ID con detalles y enlace a versión vigente (RRHH, ADMIN, DIRECCION, FUNCIONARIO)
boletaRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  controller.obtenerPorId,
);

// HU-23 CA-04: Descargar PDF de boleta con verificación de hash SHA-256 (RRHH, ADMIN, DIRECCION, FUNCIONARIO)
boletaRouter.get(
  '/:id/pdf',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  controller.descargarPdf,
);

// HU-22 CA-05 y CA-06: Rectificar boleta emitida (RRHH, ADMIN)
boletaRouter.post(
  '/:id/rectificacion',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(rectificarBoletaSchema),
  controller.rectificar,
);
