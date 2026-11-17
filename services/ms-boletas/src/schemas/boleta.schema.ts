import { z } from 'zod';
import { EstadoBoleta } from '@arca/shared';

export const rectificarBoletaSchema = z.object({
  motivo: z
    .string()
    .min(5, 'El motivo de rectificación debe tener al menos 5 caracteres')
    .max(300, 'El motivo de rectificación no puede superar los 300 caracteres'),
});

export type RectificarBoletaInput = z.infer<typeof rectificarBoletaSchema>;

export const listarBoletasQuerySchema = z.object({
  periodoId: z.string().min(1).optional(),
  funcionarioId: z.string().min(1).optional(),
  estado: z.nativeEnum(EstadoBoleta).optional(),
});

export type ListarBoletasQuery = z.infer<typeof listarBoletasQuerySchema>;
