import { createLogger, InternalClient } from '@arca/shared';
import type { BoletasStats, DashboardResponse, PersonalStats, VacacionesStats } from '../schemas/dashboard.schema';

const logger = createLogger('gateway:dashboard');

export interface DashboardClients {
  personalClient: { get<T>(path: string): Promise<T> };
  vacacionesClient: { get<T>(path: string): Promise<T> };
  boletasClient: { get<T>(path: string): Promise<T> };
}

export class DashboardService {
  private readonly personalClient: { get<T>(path: string): Promise<T> };
  private readonly vacacionesClient: { get<T>(path: string): Promise<T> };
  private readonly boletasClient: { get<T>(path: string): Promise<T> };

  constructor(clients?: Partial<DashboardClients>) {
    const apiKey = process.env.INTERNAL_API_KEY ?? '';
    const timeoutMs = 2_500; // CA-06: El dashboard debe responder en < 3s

    this.personalClient =
      clients?.personalClient ??
      new InternalClient({
        baseUrl: process.env.PERSONAL_SERVICE_URL ?? 'http://ms-personal:3002',
        apiKey,
        timeoutMs,
      });

    this.vacacionesClient =
      clients?.vacacionesClient ??
      new InternalClient({
        baseUrl: process.env.VACACIONES_SERVICE_URL ?? 'http://ms-vacaciones:3003',
        apiKey,
        timeoutMs,
      });

    this.boletasClient =
      clients?.boletasClient ??
      new InternalClient({
        baseUrl: process.env.BOLETAS_SERVICE_URL ?? 'http://ms-boletas:3005',
        apiKey,
        timeoutMs,
      });
  }

  /**
   * CA-04: Agregador paralelo con tolerancia a fallas.
   * Si uno de los microservicios no responde, esa sección retorna null (o 'ERROR')
   * y las demás cargan con normalidad.
   */
  async obtenerDashboard(): Promise<DashboardResponse> {
    const [personalResult, vacacionesResult, boletasResult] = await Promise.allSettled([
      this.personalClient.get<PersonalStats>('/internal/stats'),
      this.vacacionesClient.get<VacacionesStats>('/internal/stats'),
      this.boletasClient.get<BoletasStats>('/internal/stats'),
    ]);

    let personal: PersonalStats | null = null;
    let vacaciones: VacacionesStats | null = null;
    let boletas: BoletasStats | null = null;

    if (personalResult.status === 'fulfilled') {
      personal = personalResult.value;
    } else {
      logger.warn('dashboard.servicio_fallido', {
        servicio: 'ms-personal',
        error: personalResult.reason instanceof Error ? personalResult.reason.message : String(personalResult.reason),
      });
    }

    if (vacacionesResult.status === 'fulfilled') {
      vacaciones = vacacionesResult.value;
    } else {
      logger.warn('dashboard.servicio_fallido', {
        servicio: 'ms-vacaciones',
        error:
          vacacionesResult.reason instanceof Error ? vacacionesResult.reason.message : String(vacacionesResult.reason),
      });
    }

    if (boletasResult.status === 'fulfilled') {
      boletas = boletasResult.value;
    } else {
      logger.warn('dashboard.servicio_fallido', {
        servicio: 'ms-boletas',
        error: boletasResult.reason instanceof Error ? boletasResult.reason.message : String(boletasResult.reason),
      });
    }

    return {
      personal,
      vacaciones,
      boletas,
      servicios: {
        personal: personalResult.status === 'fulfilled' ? 'OK' : 'ERROR',
        vacaciones: vacacionesResult.status === 'fulfilled' ? 'OK' : 'ERROR',
        boletas: boletasResult.status === 'fulfilled' ? 'OK' : 'ERROR',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
