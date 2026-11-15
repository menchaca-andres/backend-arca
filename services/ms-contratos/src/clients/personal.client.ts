import { AppError, InternalClient, type FuncionarioContrato } from '@arca/shared';

export interface PersonalClient {
  getFuncionario(id: string): Promise<FuncionarioContrato | null>;
}

export class HttpPersonalClient implements PersonalClient {
  private readonly client: InternalClient;

  constructor(
    baseUrl = process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
    apiKey = process.env.INTERNAL_API_KEY ?? '',
  ) {
    this.client = new InternalClient({ baseUrl, apiKey });
  }

  async getFuncionario(id: string): Promise<FuncionarioContrato | null> {
    try {
      const funcionario = await this.client.get<FuncionarioContrato>(`/internal/funcionarios/${id}`);
      return funcionario;
    } catch (error) {
      if (error instanceof AppError && error.status === 404) return null;
      throw error;
    }
  }
}
