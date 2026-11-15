import { Router } from 'express';
import { requireRole, RolUsuario } from '@arca/shared';
import { ContratoController } from '../controllers/contrato.controller';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  generarContratoSchema,
  idContratoSchema,
  previewContratoSchema,
} from '../schemas/contrato.schema';
import { ContratoService } from '../services/contrato.service';

export function createContratoRouter(service = new ContratoService()) {
  const router = Router();
  const controller = new ContratoController(service);

  // HU-18 CA-02: Vista previa con datos reales de ms-personal antes de confirmar
  router.post(
    '/preview',
    requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
    validateBody(previewContratoSchema),
    controller.vistaPrevia,
  );

  // HU-18: Generar formalmente el contrato
  router.post(
    '/',
    requireRole(RolUsuario.ADMIN, RolUsuario.RRHH),
    validateBody(generarContratoSchema),
    controller.generar,
  );

  // Listar contratos emitidos (HU-18 / HU-19)
  router.get(
    '/',
    requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
    controller.listar,
  );

  // Detalle del contrato generado
  router.get(
    '/:id',
    requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
    validateParams(idContratoSchema),
    controller.obtenerPorId,
  );

  // Descarga del PDF generado
  router.get(
    '/:id/pdf',
    requireRole(RolUsuario.ADMIN, RolUsuario.RRHH, RolUsuario.DIRECCION, RolUsuario.FUNCIONARIO),
    validateParams(idContratoSchema),
    controller.descargarPdf,
  );

  return router;
}

export const contratoRouter = createContratoRouter();
