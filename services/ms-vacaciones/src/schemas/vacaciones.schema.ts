import { z } from 'zod';

const fechaIso = z.iso.date();
const uuid = z.uuid();

export const solicitudVacacionSchema = z
  .object({
    funcionarioId: uuid.optional(),
    fechaInicio: fechaIso,
    fechaFin: fechaIso,
  })
  .refine((value) => value.fechaFin >= value.fechaInicio, {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    path: ['fechaFin'],
  });

export const rangoFechasSchema = z
  .object({ desde: fechaIso, hasta: fechaIso })
  .refine((value) => value.hasta >= value.desde, {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    path: ['hasta'],
  });

export const rechazarSolicitudSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(5, 'El motivo de rechazo debe tener al menos 5 caracteres')
    .max(300, 'El motivo de rechazo no puede superar los 300 caracteres'),
});

export const idFuncionarioSchema = z.object({ idFuncionario: uuid });
export const idSolicitudSchema = z.object({ id: uuid });
export const feriadoAnioSchema = z.object({
  anio: z.coerce.number().int().min(1900).max(9999),
});

export const filtroHistorialSchema = z.object({
  estado: z.enum(['PENDIENTE', 'APROBADA', 'RECHAZADA']).optional(),
  anio: z.coerce.number().int().min(1900).max(9999).optional(),
});

export const filtroCalendarioSchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener el formato YYYY-MM')
    .optional(),
});

export type SolicitudVacacionInput = z.infer<typeof solicitudVacacionSchema>;
export type RechazarSolicitudInput = z.infer<typeof rechazarSolicitudSchema>;
export type FiltroHistorialInput = z.infer<typeof filtroHistorialSchema>;
export type FiltroCalendarioInput = z.infer<typeof filtroCalendarioSchema>;
