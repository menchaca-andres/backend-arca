import { Router, type RequestHandler } from 'express';
import { AppError, requireRole, RolUsuario } from '@arca/shared';
import { AuditoriaController } from '../controllers/auditoria.controller';
import { filtrosAuditoriaSchema } from '../schemas/auditoria.schema';

export function createAuditoriaRouter(controller: AuditoriaController = new AuditoriaController()): Router {
  const router = Router();

  // CA-06: Solo ADMIN puede consultar los registros de auditoría
  router.use(requireRole(RolUsuario.ADMIN));

  const validateQueryFiltros: RequestHandler = (req, res, next) => {
    const result = filtrosAuditoriaSchema.safeParse(req.query);
    if (!result.success) {
      next(AppError.badRequest('Parámetros de consulta inválidos', result.error.issues));
      return;
    }
    res.locals.query = result.data;
    next();
  };

  router.get('/', validateQueryFiltros, controller.listar);
  router.get('/:id', controller.obtenerPorId);

  return router;
}
