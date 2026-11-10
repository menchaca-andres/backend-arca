import { AppDataSource } from '../data-source';

let initialization: Promise<unknown> | undefined;

async function ensureInitialized(): Promise<void> {
  if (AppDataSource.isInitialized) return;
  if (!initialization) {
    initialization = AppDataSource.initialize().finally(() => {
      initialization = undefined;
    });
  }
  await initialization;
}

export async function verifyDatabaseConnection(): Promise<void> {
  await ensureInitialized();
  // QueryBuilder sobre el catalogo: comprueba PostgreSQL sin depender de migraciones.
  const result = await AppDataSource.createQueryBuilder()
    .select('1', 'ok')
    .from('pg_catalog.pg_database', 'database')
    .limit(1)
    .getRawOne<{ ok: number }>();
  if (result?.ok !== 1) {
    throw new Error('PostgreSQL no devolvio el resultado esperado');
  }
}
