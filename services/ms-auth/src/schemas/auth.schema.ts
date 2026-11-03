import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Correo inválido')),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
