import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { PlantillaController } from '../controllers/plantilla.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { actualizarPlantillaSchema, crearPlantillaSchema, previewPlantillaSchema } from '../schemas/plantilla.schema';

export const plantillaRouter = Router();
const controller = new PlantillaController();

// Consulta de plantillas (RRHH, ADMIN, DIRECCION)
plantillaRouter.get('/', requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION), controller.listar);

// Vista previa de renderizado Handlebars (RRHH, ADMIN)
plantillaRouter.post(
  '/preview',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(previewPlantillaSchema),
  controller.preview,
);

// Obtener detalle de plantilla con su versión activa
plantillaRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.obtenerPorId,
);

// Obtener historial completo de versiones de una plantilla
plantillaRouter.get(
  '/:id/versiones',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.obtenerHistorialVersiones,
);

// Crear nueva plantilla (v1)
plantillaRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(crearPlantillaSchema),
  controller.crear,
);

// Actualizar plantilla (crea nueva versión y archiva la anterior)
plantillaRouter.put(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(actualizarPlantillaSchema),
  controller.actualizar,
);
