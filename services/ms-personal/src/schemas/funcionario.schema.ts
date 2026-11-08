import { z } from 'zod';

export const CI_EXPEDIDOS = ['LP', 'CB', 'SC', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PD'] as const;

export const registrarFuncionarioSchema = z.object({
  // Datos personales
  ci: z.string().trim().min(3, 'El CI debe tener al menos 3 caracteres').max(15, 'El CI no puede exceder 15 caracteres'),
  ciExpedido: z.enum(CI_EXPEDIDOS, { message: 'Departamento expedidor de CI inválido' }),
  nombres: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(100),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha de nacimiento inválido (YYYY-MM-DD)'),
  sexo: z.enum(['M', 'F'] as const, { message: 'El sexo debe ser M o F' }),

  // Contacto (opcionales)
  correo: z.string().trim().email('Correo inválido').max(150).optional().nullable(),
  telefono: z.string().trim().max(20).optional().nullable(),
  direccion: z.string().trim().max(200).optional().nullable(),

  // Datos laborales
  cargoId: z.string().uuid('ID de cargo inválido'),
  remuneracion: z.number().positive('La remuneración debe ser mayor a 0'),
  fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha de ingreso inválido (YYYY-MM-DD)'),
  diasPrueba: z.number().int().min(1).max(90, 'Los días de prueba no pueden pasar de 90').default(90),
});

export type RegistrarFuncionarioInput = z.infer<typeof registrarFuncionarioSchema>;

