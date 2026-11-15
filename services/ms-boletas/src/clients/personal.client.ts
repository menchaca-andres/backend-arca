import { AppError, InternalClient, type FuncionarioContrato, type Paginated } from '@arca/shared';

export interface PersonalClient {
  getFuncionariosActivos(desde: string, hasta: string): Promise<FuncionarioContrato[]>;
}

export class HttpPersonalClient implements PersonalClient {
  private readonly client: InternalClient;

  constructor(
    baseUrl = process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
    apiKey = process.env.INTERNAL_API_KEY ?? '',
  ) {
    this.client = new InternalClient({ baseUrl, apiKey });
  }

  async getFuncionariosActivos(desde: string, hasta: string): Promise<FuncionarioContrato[]> {
    try {
      const response = await this.client.get<Paginated<FuncionarioContrato>>('/internal/funcionarios', {
        activosDesde: desde,
        activosHasta: hasta,
        pageSize: 1000,
        page: 1,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AppError && error.status === 404) return [];
      throw error;
    }
  }
}
