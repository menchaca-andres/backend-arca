import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { ConfiguracionController } from '../controllers/configuracion.controller';

export function createConfiguracionRouter(controller = new ConfiguracionController()) {
  const router = Router();
  router.use(['/conceptos', '/novedades'], requireRole(RolUsuario.RRHH));
  router.get('/conceptos', controller.listarConceptos);
  router.post('/conceptos', controller.crearConcepto);
  router.patch('/conceptos/:id', controller.actualizarConcepto);
  router.patch('/conceptos/:id/estado', controller.estado);
  router.delete('/conceptos/:id', controller.eliminar);
  router.get('/novedades', controller.listarNovedades);
  router.post('/novedades', controller.crearNovedad);
  return router;
}
