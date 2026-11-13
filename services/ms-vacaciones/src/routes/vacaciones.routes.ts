import { Router, type RequestHandler } from 'express';
import { AppError, getIdentity, requireRole, requireSelfOrRole, RolUsuario } from '@arca/shared';
import { VacacionesController } from '../controllers/vacaciones.controller';
import {
  feriadoAnioSchema,
  idFuncionarioSchema,
  idSolicitudSchema,
  rangoFechasSchema,
  rechazarSolicitudSchema,
  solicitudVacacionSchema,
} from '../schemas/vacaciones.schema';
import { VacacionesService } from '../services/vacaciones.service';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware';

const crearSolicitudAutorizada: RequestHandler = (req, _res, next) => {
  const { rol, funcionarioId } = getIdentity(req);
  const solicitado = req.body.funcionarioId as string | undefined;
  if (rol === RolUsuario.RRHH) {
    next();
    return;
  }
  if (rol === RolUsuario.FUNCIONARIO && funcionarioId && (!solicitado || solicitado === funcionarioId)) {
    next();
    return;
  }
  next(AppError.forbidden('Solo RRHH puede registrar solicitudes para otros funcionarios'));
};

export function createVacacionesRouter(service = new VacacionesService()) {
  const router = Router();
  const controller = new VacacionesController(service);

  router.get(
    '/saldo/:idFuncionario',
    requireSelfOrRole([RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION], (req) => req.params.idFuncionario),
    validateParams(idFuncionarioSchema),
    controller.obtenerSaldo,
  );
  router.get('/dias-habiles', validateQuery(rangoFechasSchema), controller.contarDias);
  router.get('/feriados/:anio', validateParams(feriadoAnioSchema), controller.listarFeriados);
  router.get(
    '/solicitudes',
    requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
    controller.listarSolicitudes,
  );
  router.post(
    '/solicitudes',
    validateBody(solicitudVacacionSchema),
    crearSolicitudAutorizada,
    controller.crearSolicitud,
  );

  // HU-15: bandeja y resolución de solicitudes (solo RRHH).
  // '/solicitudes/pendientes' se declara antes de cualquier ruta con :id.
  router.get('/solicitudes/pendientes', requireRole(RolUsuario.RRHH), controller.listarPendientes);
  router.post(
    '/solicitudes/:id/aprobar',
    requireRole(RolUsuario.RRHH),
    validateParams(idSolicitudSchema),
    controller.aprobarSolicitud,
  );
  router.post(
    '/solicitudes/:id/rechazar',
    requireRole(RolUsuario.RRHH),
    validateParams(idSolicitudSchema),
    validateBody(rechazarSolicitudSchema),
    controller.rechazarSolicitud,
  );
  return router;
}

export const vacacionesRouter = createVacacionesRouter();
