import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { HealthResponse } from './contracts';

export interface HealthOptions {
  service: string;
  dataSource?: DataSource;
}

/**
 * /health verifica la conexión a la base de datos (HU-03 CA-05).
 * Si la base está caída responde 503 para que Docker/Compose no lo marque sano.
 *
 * Nota: `SELECT 1` es la única consulta cruda permitida además del trigger de
 * inmutabilidad de boletas (HU-22); es una comprobación de infraestructura,
 * no lógica de negocio.
 */
export function healthHandler({ service, dataSource }: HealthOptions) {
  return async (_req: Request, res: Response): Promise<void> => {
    let db: HealthResponse['db'] = 'not_configured';

    if (dataSource) {
      const up =
        dataSource.isInitialized &&
        (await dataSource
          .query('SELECT 1')
          .then(() => true)
          .catch(() => false));
      db = up ? 'up' : 'down';
    }

    const ok = db !== 'down';
    res.status(ok ? 200 : 503).json({
      service,
      status: ok ? 'OK' : 'DEGRADED',
      db,
    } satisfies HealthResponse);
  };
}
