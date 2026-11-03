import { Router } from 'express';
import { RolUsuario, requireRole } from '@arca/shared';
import { CargoController } from '../controllers/cargo.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware';
import {
  cargoIdParamsSchema,
  cargoListQuerySchema,
  createCargoSchema,
  updateCargoSchema,
} from '../schemas/cargo.schema';

export const cargoRouter = Router();
const controller = new CargoController();
const roles = requireRole(RolUsuario.ADMIN, RolUsuario.RRHH);

cargoRouter.get('/', roles, validateQuery(cargoListQuerySchema), controller.list);
cargoRouter.post('/', roles, validateBody(createCargoSchema), controller.create);
cargoRouter.patch(
  '/:id',
  roles,
  validateParams(cargoIdParamsSchema),
  validateBody(updateCargoSchema),
  controller.update,
);
