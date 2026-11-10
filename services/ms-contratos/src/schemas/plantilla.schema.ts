import { z } from 'zod';
import { TipoContrato } from '@arca/shared';

export const crearPlantillaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(30, 'El código no puede exceder 30 caracteres')
    .regex(/^[A-Z0-9_-]+$/, 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(150),
  tipo: z.nativeEnum(TipoContrato, { message: 'Tipo de contrato inválido' }),
  contenido: z.string().trim().min(20, 'El contenido de la plantilla debe tener al menos 20 caracteres'),
});

export const actualizarPlantillaSchema = z.object({
  nombre: z.string().trim().min(3).max(150).optional(),
  tipo: z.nativeEnum(TipoContrato).optional(),
  contenido: z.string().trim().min(20, 'El contenido de la versión debe tener al menos 20 caracteres'),
});

export const previewPlantillaSchema = z.object({
  contenido: z.string().trim().min(1, 'El contenido no puede estar vacío'),
  datos: z.record(z.string(), z.unknown()).optional(),
});

export type CrearPlantillaInput = z.infer<typeof crearPlantillaSchema>;
export type ActualizarPlantillaInput = z.infer<typeof actualizarPlantillaSchema>;
export type PreviewPlantillaInput = z.infer<typeof previewPlantillaSchema>;
