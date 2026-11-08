import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { FuncionarioController } from '../controllers/funcionario.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { registrarFuncionarioSchema } from '../schemas/funcionario.schema';

export const funcionarioRouter = Router();
const controller = new FuncionarioController();

// HU-08: Solo RRHH y ADMIN pueden dar de alta un funcionario
funcionarioRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
  validateBody(registrarFuncionarioSchema),
  controller.registrar,
);

// Listado de funcionarios para selectores y consultas
funcionarioRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION),
  controller.listar,
);

// Consulta de ficha (CA-08)
funcionarioRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
  controller.obtenerFicha,
);

