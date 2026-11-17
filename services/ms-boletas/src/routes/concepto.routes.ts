import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { ConceptoController } from '../controllers/concepto.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { actualizarConceptoSchema, crearConceptoSchema } from '../schemas/concepto.schema';

export const conceptoRouter = Router();
const controller = new ConceptoController();

// Listar conceptos (RRHH, ADMIN, DIRECCION)
conceptoRouter.get('/', requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION), controller.listar);

// Obtener concepto por id (RRHH, ADMIN, DIRECCION)
conceptoRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.obtenerPorId,
);

// Crear concepto (RRHH, ADMIN)
conceptoRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(crearConceptoSchema),
  controller.crear,
);

// Actualizar concepto (RRHH, ADMIN)
conceptoRouter.put(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(actualizarConceptoSchema),
  controller.actualizar,
);

// Eliminar o desactivar concepto (RRHH, ADMIN)
conceptoRouter.delete('/:id', requireRole(RolUsuario.ADMIN, RolUsuario.RRHH), controller.eliminar);
