import 'dotenv/config';
import { logger, requirePort, startService } from '@arca/shared';
import { app } from './app';
import { AppDataSource } from './data-source';

async function main(): Promise<void> {
  const port = requirePort('PORT', 3004);
  await startService({ app, dataSource: AppDataSource, port, name: 'ms-contratos' });
}

main().catch((error: unknown) => {
  logger.error('No se pudo iniciar ms-contratos', error);
  process.exit(1);
});
