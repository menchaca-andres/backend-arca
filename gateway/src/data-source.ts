import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const SERVICE_SCHEMA = 'auditoria';

if (process.env.DB_SCHEMA && process.env.DB_SCHEMA !== SERVICE_SCHEMA) {
  throw new Error('DB_SCHEMA debe ser auditoria para gateway');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: SERVICE_SCHEMA,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + '/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  connectTimeoutMS: 3000,
  extra: {
    query_timeout: 3000,
    options: '-c search_path=auditoria',
  },
  // gen_random_uuid() viene en Postgres; uuid-ossp quedaría instalada en un solo schema.
  uuidExtension: 'pgcrypto',
  installExtensions: false,
});
