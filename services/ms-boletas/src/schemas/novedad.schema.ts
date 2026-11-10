import { z } from 'zod';

export const registrarNovedadSchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1, 'El mes debe estar entre 1 y 12').max(12, 'El mes debe estar entre 1 y 12'),
  funcionarioId: z.string().uuid('ID de funcionario inválido'),
  conceptoId: z.string().uuid('ID de concepto inválido'),
  monto: z.coerce.number().positive('El monto de la novedad debe ser mayor a 0'),
  descripcion: z.string().trim().max(200).optional().nullable(),
});

export const listarNovedadesQuerySchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2100).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
  funcionarioId: z.string().uuid().optional(),
});

export type RegistrarNovedadInput = z.infer<typeof registrarNovedadSchema>;
export type ListarNovedadesQuery = z.infer<typeof listarNovedadesQuerySchema>;

