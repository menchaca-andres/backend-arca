import { InternalClient, type FuncionarioContrato } from '@arca/shared';

export interface IPersonalClient {
  getFuncionario(id: string): Promise<FuncionarioContrato | null>;
}

export class PersonalClient implements IPersonalClient {
  private client: InternalClient;

  constructor(baseUrl?: string, apiKey?: string) {
    const url = baseUrl ?? process.env.PERSONAL_SERVICE_URL ?? 'http://localhost:3002';
    const key = apiKey ?? process.env.INTERNAL_API_KEY ?? '';
    this.client = new InternalClient({
      baseUrl: url,
      apiKey: key,
      timeoutMs: 3_000,
      retries: 1,
    });
  }

  async getFuncionario(id: string): Promise<FuncionarioContrato | null> {
    try {
      return await this.client.get<FuncionarioContrato>(`/internal/funcionarios/${id}`);
    } catch (error: any) {
      if (error?.status === 404 || error?.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }
}
