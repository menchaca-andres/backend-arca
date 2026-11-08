import { z } from 'zod';
import { RolUsuario } from '@arca/shared';

export const crearUsuarioSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.string().email('Correo inválido')),
    rol: z.nativeEnum(RolUsuario, {
      message: 'Rol inválido',
    }),
    funcionarioId: z.string().uuid('ID de funcionario inválido').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.rol === RolUsuario.FUNCIONARIO && !data.funcionarioId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['funcionarioId'],
        message: 'El funcionario vinculado es obligatorio para el rol FUNCIONARIO',
      });
    }
  });

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;

export const cambiarRolSchema = z
  .object({
    rol: z.nativeEnum(RolUsuario, {
      message: 'Rol inválido',
    }),
    funcionarioId: z.string().uuid('ID de funcionario inválido').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.rol === RolUsuario.FUNCIONARIO && !data.funcionarioId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['funcionarioId'],
        message: 'El funcionario vinculado es obligatorio para el rol FUNCIONARIO',
      });
    }
  });

export type CambiarRolInput = z.infer<typeof cambiarRolSchema>;

export const cambiarEstadoSchema = z.object({
  activo: z.boolean({ message: 'El estado activo es obligatorio' }),
});

export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;

export const internalEstadoUsuarioSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO'] as const, {
    message: 'Estado debe ser ACTIVO o INACTIVO',
  }),
  motivo: z.string().max(200).optional(),
});

export type InternalEstadoUsuarioInput = z.infer<typeof internalEstadoUsuarioSchema>;

export const listarUsuariosQuerySchema = z.object({
  rol: z.nativeEnum(RolUsuario).optional(),
  activo: z
    .enum(['true', 'false'] as const)
    .transform((val) => val === 'true')
    .optional(),
});

export type ListarUsuariosQuery = z.infer<typeof listarUsuariosQuerySchema>;
