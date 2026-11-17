import { z } from 'zod';

export const abrirPeriodoSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

export type AbrirPeriodoInput = z.infer<typeof abrirPeriodoSchema>;
