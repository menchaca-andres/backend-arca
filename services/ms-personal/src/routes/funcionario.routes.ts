import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { FuncionarioController } from '../controllers/funcionario.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { registrarFuncionarioSchema, ratificarFuncionarioSchema, darDeBajaSchema } from '../schemas/funcionario.schema';

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

// Listado de funcionarios para selectores y consultas (admite ?estado=)
funcionarioRouter.get('/', requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION), controller.listar);

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

// Consulta de ficha (CA-08)
funcionarioRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  controller.obtenerFicha,
);
