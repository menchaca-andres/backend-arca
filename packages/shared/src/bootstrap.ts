import type { Server } from 'node:http';
import type { Express } from 'express';
import type { DataSource } from 'typeorm';
import { logger } from './logger';

export interface StartServiceOptions {
  app: Express;
  dataSource: DataSource;
  port: number;
  name: string;
  /** Intentos de conexión iniciales (con 2 s entre cada uno). */
  connectionAttempts?: number;
  /** Tiempo máximo para cerrar ordenadamente antes de forzar la salida. */
  shutdownTimeoutMs?: number;
}

/**
 * Arranque común de los microservicios:
 * 1. Conecta TypeORM con reintentos (la BD puede tardar en levantar).
 * 2. Escucha HTTP.
 * 3. Cierra la base y el servidor ante SIGTERM/SIGINT.
 */
export async function startService(options: StartServiceOptions): Promise<Server> {
  const { app, dataSource, port, name, connectionAttempts = 10, shutdownTimeoutMs = 10_000 } = options;

  await initializeDataSource(dataSource, name, connectionAttempts);

  const server = app.listen(port, () => {
    logger.info(`${name} escuchando en el puerto ${port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${name} recibió ${signal}; cerrando`);

    const timer = setTimeout(() => {
      logger.error(`${name} no cerró a tiempo; salida forzada`);
      process.exit(1);
    }, shutdownTimeoutMs);
    timer.unref();

    server.close(() => {
      void dataSource
        .destroy()
        .catch((error: unknown) => logger.error(`${name} error al cerrar la base`, error))
        .finally(() => {
          clearTimeout(timer);
          process.exit(0);
        });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

async function initializeDataSource(dataSource: DataSource, name: string, attempts: number): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      logger.info(`${name} conectado a la base de datos`);
      return;
    } catch (error) {
      logger.error(`${name} no pudo conectar a la base (intento ${attempt}/${attempts})`, error);
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
}
