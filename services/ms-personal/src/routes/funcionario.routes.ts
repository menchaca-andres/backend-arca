import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { FuncionarioController } from '../controllers/funcionario.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware';
import {
  actualizarContactoSchema,
  cambiarAsignacionSchema,
  darDeBajaSchema,
  funcionarioIdParamsSchema,
  listarPadronQuerySchema,
  ratificarFuncionarioSchema,
  registrarFuncionarioSchema,
} from '../schemas/funcionario.schema';

export const funcionarioRouter = Router();
const controller = new FuncionarioController();

// HU-11: CA-04 Aviso con funcionarios cuyo periodo de prueba termina en los próximos 7 días
// (Registrado antes de /:id para evitar colisión de ruta)
funcionarioRouter.get(
  '/prueba-por-vencer',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.obtenerPruebaPorVencer,
);

// HU-08: Solo RRHH y ADMIN pueden dar de alta un funcionario
funcionarioRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(registrarFuncionarioSchema),
  controller.registrar,
);

// HU-09: Padrón paginado (?q=&areaId=&cargoId=&estado=&page=&pageSize=)
funcionarioRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  validateQuery(listarPadronQuerySchema),
  controller.listar,
);

// HU-11: Ratificar funcionario
funcionarioRouter.post(
  '/:id/ratificacion',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(ratificarFuncionarioSchema),
  controller.ratificar,
);

// HU-12: Dar de baja a un funcionario
funcionarioRouter.post(
  '/:id/baja',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(darDeBajaSchema),
  controller.darDeBaja,
);

// HU-10: Cambio de área, cargo o remuneración con historial
funcionarioRouter.post(
  '/:id/asignaciones',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateParams(funcionarioIdParamsSchema),
  validateBody(cambiarAsignacionSchema),
  controller.cambiarAsignacion,
);

// HU-10: CA-07 Datos de contacto
funcionarioRouter.patch(
  '/:id/contacto',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateParams(funcionarioIdParamsSchema),
  validateBody(actualizarContactoSchema),
  controller.actualizarContacto,
);

// HU-09: Ficha del funcionario; un FUNCIONARIO solo ve la suya (CA-04)
funcionarioRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  validateParams(funcionarioIdParamsSchema),
  controller.obtenerFicha,
);
