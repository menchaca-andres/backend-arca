import { InternalClient, logger } from '@arca/shared';

export interface DesactivarUsuarioResult {
  id: string | null;
  desactivado: boolean;
}

export interface IAuthClient {
  desactivarUsuarioPorFuncionario(
    funcionarioId: string,
    motivo?: string,
  ): Promise<DesactivarUsuarioResult>;
}

export class AuthClient implements IAuthClient {
  private client: InternalClient;

  constructor(baseUrl?: string, apiKey?: string) {
    const url = baseUrl ?? process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    const key = apiKey ?? process.env.INTERNAL_API_KEY ?? '';
    this.client = new InternalClient({
      baseUrl: url,
      apiKey: key,
      timeoutMs: 3_000,
      retries: 1,
    });
  }

  async desactivarUsuarioPorFuncionario(
    funcionarioId: string,
    motivo: string = 'Baja de funcionario',
  ): Promise<DesactivarUsuarioResult> {
    try {
      const response = await this.client.patch<{ id: string; estado: string }>(
        `/internal/usuarios/${funcionarioId}/estado`,
        { estado: 'INACTIVO', motivo },
      );
      return {
        id: response.id,
        desactivado: true,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; code?: string; message?: string };
      // CA-05: Si no tiene cuenta asociada (404), no es un error
      if (err?.status === 404 || err?.code === 'NOT_FOUND') {
        return {
          id: null,
          desactivado: false,
        };
      }
      // T2_HU12: Llamada con reintento (gestionada por InternalClient) y registro si falla
      logger.warn('No se pudo desactivar la cuenta en ms-auth tras reintento', {
        funcionarioId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        id: null,
        desactivado: false,
      };
    }
  }
}
