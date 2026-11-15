import { z } from 'zod';

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

export type GenerarContratoInput = z.infer<typeof generarContratoSchema>;
export type PreviewContratoInput = z.infer<typeof previewContratoSchema>;
