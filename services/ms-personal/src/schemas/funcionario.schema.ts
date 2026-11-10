import { z } from 'zod';
import { EstadoFuncionario, MotivoAsignacion, MotivoBaja } from '@arca/shared';

export const CI_EXPEDIDOS = ['LP', 'CB', 'SC', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PD'] as const;

export const registrarFuncionarioSchema = z.object({
  // Datos personales
  ci: z
    .string()
    .trim()
    .min(3, 'El CI debe tener al menos 3 caracteres')
    .max(15, 'El CI no puede exceder 15 caracteres'),
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

// HU-11: Ratificar funcionario
export const ratificarFuncionarioSchema = z.object({
  fechaRatificacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha de ratificación inválido (YYYY-MM-DD)')
    .optional(),
});

export type RatificarFuncionarioInput = z.infer<typeof ratificarFuncionarioSchema>;

// HU-12: Dar de baja a un funcionario
export const darDeBajaSchema = z
  .object({
    fechaBaja: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha de baja inválido (YYYY-MM-DD)'),
    motivoBaja: z.nativeEnum(MotivoBaja, { message: 'Motivo de baja inválido' }),
    detalleBaja: z.string().trim().max(300, 'El detalle no puede exceder 300 caracteres').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.motivoBaja === MotivoBaja.OTRO && (!data.detalleBaja || data.detalleBaja.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['detalleBaja'],
        message: 'El detalle es obligatorio cuando el motivo de baja es OTRO',
      });
    }
  });

export type DarDeBajaInput = z.infer<typeof darDeBajaSchema>;

const fecha = (campo: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Formato de ${campo} inválido (YYYY-MM-DD)`);

export const funcionarioIdParamsSchema = z.object({ id: z.uuid('ID de funcionario inválido') });

// HU-09: CA-01 y CA-02 Padrón paginado de 20 en 20, con búsqueda y filtros
export const listarPadronQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    areaId: z.uuid('ID de área inválido').optional(),
    cargoId: z.uuid('ID de cargo inválido').optional(),
    estado: z.enum(['EN_PRUEBA', 'RATIFICADO', 'BAJA', 'TODOS'] as const).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListarPadronQuery = z.infer<typeof listarPadronQuerySchema>;

// HU-09: CA-05 Contrato interno GET /internal/funcionarios
export const listarContratosQuerySchema = z
  .object({
    estado: z.enum(EstadoFuncionario, { message: 'Estado de funcionario inválido' }).optional(),
    activosDesde: fecha('activosDesde').optional(),
    activosHasta: fecha('activosHasta').optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict()
  .refine((data) => !data.activosDesde || !data.activosHasta || data.activosDesde <= data.activosHasta, {
    message: 'activosDesde no puede ser posterior a activosHasta',
    path: ['activosHasta'],
  });

export type ListarContratosQuery = z.infer<typeof listarContratosQuerySchema>;

// HU-10: CA-01 Cambio de cargo (y con él, de área) y/o remuneración
export const MOTIVOS_CAMBIO = [
  MotivoAsignacion.ASCENSO,
  MotivoAsignacion.TRASLADO,
  MotivoAsignacion.INCREMENTO,
  MotivoAsignacion.CORRECCION,
] as const;

export const cambiarAsignacionSchema = z
  .object({
    cargoId: z.uuid('ID de cargo inválido').optional(),
    remuneracion: z.number().positive('La remuneración debe ser mayor a 0').optional(),
    vigenteDesde: fecha('vigenteDesde'),
    motivo: z.enum(MOTIVOS_CAMBIO, { message: 'Motivo inválido (ASCENSO, TRASLADO, INCREMENTO o CORRECCION)' }),
  })
  .strict()
  .refine((data) => data.cargoId !== undefined || data.remuneracion !== undefined, {
    message: 'Debe indicar un nuevo cargo o una nueva remuneración',
    path: ['cargoId'],
  });

export type CambiarAsignacionInput = z.infer<typeof cambiarAsignacionSchema>;

// HU-10: CA-07 Datos de contacto sin historial. Es strict, así que el CI no se puede enviar.
export const actualizarContactoSchema = z
  .object({
    correo: z.string().trim().email('Correo inválido').max(150).nullable().optional(),
    telefono: z.string().trim().max(20).nullable().optional(),
    direccion: z.string().trim().max(200).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un dato de contacto' });

export type ActualizarContactoInput = z.infer<typeof actualizarContactoSchema>;
