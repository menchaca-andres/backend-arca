import { AppError, HttpClient } from '@arca/shared';
import { z } from 'zod';

export interface PersonalClient {
  verificarFuncionario(id: string): Promise<void>;
}
export class HttpPersonalClient implements PersonalClient {
  async verificarFuncionario(id: string): Promise<void> {
    const client = new HttpClient({
      baseUrl: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
      internalApiKey: process.env.INTERNAL_API_KEY ?? '',
    });
    let data: unknown;
    try {
      data = await client.request<unknown>(`/internal/funcionarios/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof AppError && error.code === 'NOT_FOUND') {
        throw AppError.notFound('Funcionario no encontrado');
      }
      // Un fallo de autenticación entre servicios no invalida la sesión del usuario.
      throw AppError.serviceUnavailable('No se pudo validar el funcionario con Personal');
    }
    const parsed = z.object({ id: z.string().uuid() }).safeParse(data);
    if (!parsed.success || parsed.data.id !== id) throw AppError.serviceUnavailable('Respuesta inválida de Personal');
  }
}
