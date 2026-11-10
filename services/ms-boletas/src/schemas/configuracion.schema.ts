import { z } from 'zod';

const campos = {
  nombre: z.string().trim().min(1).max(100),
  tipo: z.enum(['HABER', 'DESCUENTO']),
  formaCalculo: z.enum(['MONTO_FIJO', 'PORCENTAJE']),
  valor: z.number().finite().min(0).max(99999999.9999).multipleOf(0.0001),
  base: z.enum(['HABER_BASICO', 'TOTAL_GANADO']).nullable(),
  automatico: z.boolean(),
  orden: z.number().int().min(0).max(32767),
};
function reglas(data: { formaCalculo: string; valor: number; base: string | null }, ctx: z.RefinementCtx) {
  if (data.formaCalculo === 'PORCENTAJE' && (data.valor > 100 || data.base === null)) {
    ctx.addIssue({ code: 'custom', message: 'Un porcentaje debe estar entre 0 y 100 y tener base', path: ['valor'] });
  }
  if (data.formaCalculo === 'MONTO_FIJO' && (data.valor <= 0 || data.base !== null)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Un monto fijo debe ser positivo y su base debe ser null',
      path: ['valor'],
    });
  }
}
export const editarConceptoSchema = z.object(campos).strict().superRefine(reglas);
export const crearConceptoSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((v) => v.toUpperCase()),
    ...campos,
  })
  .strict()
  .superRefine(reglas);
export const idSchema = z.object({ id: z.string().uuid() });
export const estadoSchema = z.object({ activo: z.boolean() }).strict();
export const listarConceptosSchema = z
  .object({
    incluirInactivos: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();
const periodo = { anio: z.number().int().min(1900).max(9999), mes: z.number().int().min(1).max(12) };
export const crearNovedadSchema = z
  .object({
    ...periodo,
    funcionarioId: z.string().uuid(),
    conceptoId: z.string().uuid(),
    monto: z.number().finite().positive().max(9999999999.99).multipleOf(0.01),
    descripcion: z.string().trim().max(200).nullable().optional(),
  })
  .strict();
export const listarNovedadesSchema = z
  .object({
    anio: z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number)
      .pipe(periodo.anio),
    mes: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(periodo.mes),
    funcionarioId: z.string().uuid().optional(),
  })
  .strict();
export type CrearConceptoInput = z.infer<typeof crearConceptoSchema>;
export type EditarConceptoInput = z.infer<typeof editarConceptoSchema>;
export type CrearNovedadInput = z.infer<typeof crearNovedadSchema>;
export type FiltroNovedades = z.infer<typeof listarNovedadesSchema>;
