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

export const idFuncionarioSchema = z.object({ idFuncionario: uuid });
export const idSolicitudSchema = z.object({ id: uuid });
export const feriadoAnioSchema = z.object({
  anio: z.coerce.number().int().min(1900).max(9999),
});

export type SolicitudVacacionInput = z.infer<typeof solicitudVacacionSchema>;
