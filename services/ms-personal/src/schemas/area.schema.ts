import { z } from 'zod';

const codigo = z
  .string()
  .trim()
  .min(1, 'El código es obligatorio')
  .max(20, 'El código no puede superar los 20 caracteres')
  .transform((value) => value.toUpperCase());

const nombre = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(100, 'El nombre no puede superar los 100 caracteres');

export const createAreaSchema = z.object({ codigo, nombre }).strict();

export const updateAreaSchema = z
  .object({
    codigo: codigo.optional(),
    nombre: nombre.optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const areaIdParamsSchema = z.object({ id: z.uuid('ID inválido') });

export const areaListQuerySchema = z
  .object({
    incluirInactivos: z.enum(['true', 'false']).optional(),
  })
  .strict();

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type AreaListQuery = z.infer<typeof areaListQuerySchema>;
