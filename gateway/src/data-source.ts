import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { optionalInt, requireEnv } from '@arca/shared';

const { DATABASE_URL, DB_SCHEMA } = requireEnv('DATABASE_URL', 'DB_SCHEMA');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  schema: DB_SCHEMA,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + '/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  // gen_random_uuid() viene en Postgres; uuid-ossp quedaría instalada en un solo schema.
  uuidExtension: 'pgcrypto',
  installExtensions: false,
  // Supabase y el pooler tienen límites; 5 conexiones por servicio alcanza para el MVP.
  extra: { max: optionalInt('DB_POOL_MAX', 5) },
});
