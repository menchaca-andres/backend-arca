import { z } from 'zod';

const nombre = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(100, 'El nombre no puede superar los 100 caracteres');

const salario = z.coerce
  .number()
  .positive('El salario debe ser mayor a cero')
  .max(9_999_999_999.99, 'El salario excede el máximo permitido');

export const createCargoSchema = z
  .object({
    areaId: z.uuid('Área inválida'),
    nombre,
    salarioMin: salario,
    salarioMax: salario,
  })
  .strict()
  .refine((data) => data.salarioMin <= data.salarioMax, {
    message: 'El salario mínimo no puede superar al máximo',
    path: ['salarioMax'],
  });

export const updateCargoSchema = z
  .object({
    nombre: nombre.optional(),
    salarioMin: salario.optional(),
    salarioMax: salario.optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const cargoIdParamsSchema = z.object({ id: z.uuid('ID inválido') });

export const cargoListQuerySchema = z
  .object({
    incluirInactivos: z.enum(['true', 'false']).optional(),
    areaId: z.uuid('Área inválida').optional(),
  })
  .strict();

export type CreateCargoInput = z.infer<typeof createCargoSchema>;
export type UpdateCargoInput = z.infer<typeof updateCargoSchema>;
export type CargoListQuery = z.infer<typeof cargoListQuerySchema>;
