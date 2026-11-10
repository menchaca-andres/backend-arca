import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const SERVICE_SCHEMA = 'contratos';

if (process.env.DB_SCHEMA && process.env.DB_SCHEMA !== SERVICE_SCHEMA) {
  throw new Error('DB_SCHEMA debe ser contratos para ms-contratos');
}

const sslCaFile = process.env.DB_SSL_CA_FILE;
const poolMax = Number(process.env.DB_POOL_MAX ?? '5');

if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 5) {
  throw new Error('DB_POOL_MAX debe ser un entero entre 1 y 5');
}
// pg puede reemplazar ssl al interpretar sslmode en la URL: usar una sola fuente.
if (sslCaFile && process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).searchParams.has('sslmode')) {
  throw new Error('Usa DB_SSL_CA_FILE sin sslmode en DATABASE_URL');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: SERVICE_SCHEMA,
  ssl: sslCaFile ? { ca: readFileSync(sslCaFile, 'utf8'), rejectUnauthorized: true } : undefined,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + '/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  connectTimeoutMS: 3000,
  extra: {
    max: poolMax,
    query_timeout: 3000,
    options: '-c search_path=contratos',
  },
  // gen_random_uuid() viene en Postgres; uuid-ossp quedaría instalada en un solo schema.
  uuidExtension: 'pgcrypto',
  installExtensions: false,
});
