import { z } from 'zod';
import { EstadoContrato } from '@arca/shared';

const uuid = z.string().uuid('Debe ser un UUID válido');

export const generarContratoSchema = z.object({
  funcionarioId: uuid,
  plantillaId: uuid.optional(),
});

export const previewContratoSchema = z.object({
  funcionarioId: uuid,
  plantillaId: uuid.optional(),
});

export const idContratoSchema = z.object({
  id: uuid,
});

export const filtrosContratoSchema = z.object({
  funcionarioId: uuid.optional(),
  plantillaId: uuid.optional(),
  estado: z.nativeEnum(EstadoContrato).optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export type GenerarContratoInput = z.infer<typeof generarContratoSchema>;
export type PreviewContratoInput = z.infer<typeof previewContratoSchema>;
export type FiltrosContratoInput = z.infer<typeof filtrosContratoSchema>;
