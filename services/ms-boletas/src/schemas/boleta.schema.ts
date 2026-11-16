import { z } from 'zod';

export const rectificarBoletaSchema = z.object({
  motivo: z
    .string()
    .min(5, 'El motivo de rectificación debe tener al menos 5 caracteres')
    .max(300, 'El motivo de rectificación no puede superar los 300 caracteres'),
});

export type RectificarBoletaInput = z.infer<typeof rectificarBoletaSchema>;
