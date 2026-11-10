import { AppError } from '@arca/shared';
import { verifyDatabaseConnection } from '../repositories/health.repository';

export async function checkHealth(): Promise<void> {
  try {
    await verifyDatabaseConnection();
  } catch {
    throw new AppError('SERVICE_UNAVAILABLE', 'Base de datos no disponible');
  }
}
