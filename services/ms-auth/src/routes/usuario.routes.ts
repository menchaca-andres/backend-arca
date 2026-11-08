import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { UsuarioController } from '../controllers/usuario.controller';
import { validateBody } from '../middlewares/validate.middleware';
import {
  crearUsuarioSchema,
  cambiarRolSchema,
  cambiarEstadoSchema,
  internalEstadoUsuarioSchema,
} from '../schemas/usuario.schema';

export const usuarioRouter = Router();
const controller = new UsuarioController();

// CA-01: Solo ADMIN puede crear, listar, cambiar el rol y activar o desactivar usuarios.
usuarioRouter.use(requireRole(RolUsuario.ADMIN));

usuarioRouter.get('/', controller.listar);
usuarioRouter.post('/', validateBody(crearUsuarioSchema), controller.crear);
usuarioRouter.get('/:id', controller.obtenerPorId);
usuarioRouter.patch('/:id/rol', validateBody(cambiarRolSchema), controller.cambiarRol);
usuarioRouter.patch('/:id/estado', validateBody(cambiarEstadoSchema), controller.cambiarEstado);

// Router para endpoints internos protegidos con x-internal-key
export const internalUsuarioRouter = Router();
internalUsuarioRouter.patch(
  '/usuarios/:id/estado',
  validateBody(internalEstadoUsuarioSchema),
  controller.cambiarEstadoInterno,
);

