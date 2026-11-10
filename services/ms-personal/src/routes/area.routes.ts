import { Router } from 'express';
import { RolUsuario, requireRole } from '@arca/shared';
import { AreaController } from '../controllers/area.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware';
import { areaIdParamsSchema, areaListQuerySchema, createAreaSchema, updateAreaSchema } from '../schemas/area.schema';

export const areaRouter = Router();
const controller = new AreaController();
const roles = requireRole(RolUsuario.ADMIN, RolUsuario.RRHH);

areaRouter.get('/', roles, validateQuery(areaListQuerySchema), controller.list);
areaRouter.post('/', roles, validateBody(createAreaSchema), controller.create);
areaRouter.patch('/:id', roles, validateParams(areaIdParamsSchema), validateBody(updateAreaSchema), controller.update);
