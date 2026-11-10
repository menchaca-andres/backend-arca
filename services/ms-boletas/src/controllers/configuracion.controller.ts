import { AppError, asyncHandler, getIdentity } from '@arca/shared';
import { z } from 'zod';
import { ConfiguracionService } from '../services/configuracion.service';
import {
  crearConceptoSchema,
  crearNovedadSchema,
  editarConceptoSchema,
  estadoSchema,
  idSchema,
  listarConceptosSchema,
  listarNovedadesSchema,
} from '../schemas/configuracion.schema';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw AppError.badRequest('Entrada inválida', result.error.flatten());
  return result.data;
}
export class ConfiguracionController {
  constructor(private readonly service = new ConfiguracionService()) {}
  listarConceptos = asyncHandler(async (req, res) => {
    res.json(await this.service.listarConceptos(parse(listarConceptosSchema, req.query).incluirInactivos));
  });
  crearConcepto = asyncHandler(async (req, res) => {
    res.status(201).json(await this.service.crearConcepto(parse(crearConceptoSchema, req.body)));
  });
  actualizarConcepto = asyncHandler(async (req, res) => {
    res.json(
      await this.service.actualizarConcepto(parse(idSchema, req.params).id, parse(editarConceptoSchema, req.body)),
    );
  });
  estado = asyncHandler(async (req, res) => {
    res.json(await this.service.cambiarEstado(parse(idSchema, req.params).id, parse(estadoSchema, req.body).activo));
  });
  eliminar = asyncHandler(async (req, res) => {
    await this.service.eliminarConcepto(parse(idSchema, req.params).id);
    res.status(204).end();
  });
  listarNovedades = asyncHandler(async (req, res) => {
    res.json(await this.service.listarNovedades(parse(listarNovedadesSchema, req.query)));
  });
  crearNovedad = asyncHandler(async (req, res) => {
    const autor = getIdentity(req).userId;
    if (!z.string().uuid().safeParse(autor).success) throw AppError.unauthorized('Identidad inválida');
    res.status(201).json(await this.service.crearNovedad(parse(crearNovedadSchema, req.body), autor!));
  });
}
