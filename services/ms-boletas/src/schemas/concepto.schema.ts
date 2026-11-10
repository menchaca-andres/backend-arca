import { z } from 'zod';
import { BaseCalculo, FormaCalculo, TipoConcepto } from '@arca/shared';

export const crearConceptoSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(2, 'El código debe tener al menos 2 caracteres')
      .max(20, 'El código no puede superar los 20 caracteres')
      .regex(/^[A-Z0-9_]+$/, 'El código solo puede contener letras mayúsculas, números y guión bajo'),
    nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
    tipo: z.nativeEnum(TipoConcepto, { message: 'Tipo de concepto inválido (HABER o DESCUENTO)' }),
    formaCalculo: z.nativeEnum(FormaCalculo, {
      message: 'Forma de cálculo inválida (MONTO_FIJO, PORCENTAJE o SISTEMA)',
    }),
    valor: z.number().nullable().optional(),
    base: z.nativeEnum(BaseCalculo).nullable().optional(),
    automatico: z.boolean({ message: 'Debe especificar si el concepto es automático' }),
    orden: z.number().int().min(1, 'El orden debe ser mayor o igual a 1').default(10),
  })
  .superRefine((data, ctx) => {
    if (data.formaCalculo === FormaCalculo.PORCENTAJE) {
      if (data.valor === undefined || data.valor === null || data.valor < 0 || data.valor > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El porcentaje debe estar entre 0 y 100',
          path: ['valor'],
        });
      }
      if (!data.base) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Para forma de cálculo PORCENTAJE, se requiere definir la base de cálculo (HABER_BASICO o TOTAL_GANADO)',
          path: ['base'],
        });
      }
    } else if (data.formaCalculo === FormaCalculo.MONTO_FIJO) {
      if (data.valor === undefined || data.valor === null || data.valor <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Para MONTO_FIJO, el valor debe ser mayor a 0',
          path: ['valor'],
        });
      }
      if (data.base !== null && data.base !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Para MONTO_FIJO, la base de cálculo debe ser nula',
          path: ['base'],
        });
      }
    } else if (data.formaCalculo === FormaCalculo.SISTEMA) {
      if (data.valor !== null && data.valor !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Para SISTEMA, el valor debe ser nulo',
          path: ['valor'],
        });
      }
      if (data.base !== null && data.base !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Para SISTEMA, la base debe ser nula',
          path: ['base'],
        });
      }
    }
  });

export const actualizarConceptoSchema = z
  .object({
    nombre: z.string().trim().min(3).max(100).optional(),
    formaCalculo: z.nativeEnum(FormaCalculo).optional(),
    valor: z.number().nullable().optional(),
    base: z.nativeEnum(BaseCalculo).nullable().optional(),
    automatico: z.boolean().optional(),
    orden: z.number().int().min(1).optional(),
    activo: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.formaCalculo === FormaCalculo.PORCENTAJE) {
      if (data.valor !== undefined && (data.valor === null || data.valor < 0 || data.valor > 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El porcentaje debe estar entre 0 y 100',
          path: ['valor'],
        });
      }
      if (data.base === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Para forma de cálculo PORCENTAJE, la base no puede ser nula',
          path: ['base'],
        });
      }
    } else if (data.formaCalculo === FormaCalculo.MONTO_FIJO) {
      if (data.valor !== undefined && (data.valor === null || data.valor <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Para MONTO_FIJO, el valor debe ser mayor a 0',
          path: ['valor'],
        });
      }
    }
  });

export type CrearConceptoInput = z.infer<typeof crearConceptoSchema>;
export type ActualizarConceptoInput = z.infer<typeof actualizarConceptoSchema>;
