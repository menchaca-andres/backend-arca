import { AppError, InternalClient, type FuncionarioContrato } from '@arca/shared';
import type { DatosFuncionarioVacaciones } from '../domain/calculo-vacaciones';

export interface PersonalClient {
  getFuncionario(id: string): Promise<DatosFuncionarioVacaciones | null>;
}

export class HttpPersonalClient implements PersonalClient {
  private readonly client: InternalClient;

  constructor(
    baseUrl = process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
    apiKey = process.env.INTERNAL_API_KEY ?? '',
  ) {
    this.client = new InternalClient({ baseUrl, apiKey });
  }

  async getFuncionario(id: string): Promise<DatosFuncionarioVacaciones | null> {
    try {
      const funcionario = await this.client.get<FuncionarioContrato>(`/internal/funcionarios/${id}`);
      return {
        id: funcionario.id,
        nombreCompleto: `${funcionario.nombres} ${funcionario.apellidos}`,
        fechaIngreso: funcionario.fechaIngreso,
        estado: funcionario.estado,
      };
    } catch (error) {
      if (error instanceof AppError && error.status === 404) return null;
      throw error;
    }
  }
}
