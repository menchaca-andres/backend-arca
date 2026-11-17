import { z } from 'zod';

export const filtrosAuditoriaSchema = z.object({
  usuarioId: z.string().uuid('ID de usuario inválido').optional(),
  servicio: z.string().min(1).max(30).optional(),
  desde: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  hasta: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  resultado: z.enum(['EXITO', 'ERROR']).optional(),
  metodo: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type FiltrosAuditoria = z.infer<typeof filtrosAuditoriaSchema>;

export interface RegistrarEventoDto {
  usuarioId?: string | null;
  rol?: string | null;
  metodo: string;
  ruta: string;
  servicio: string;
  recursoId?: string | null;
  statusCode: number;
  ip?: string | null;
  requestId: string;
}
