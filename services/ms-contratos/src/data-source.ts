import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: process.env.DB_SCHEMA,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + '/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  // gen_random_uuid() viene en Postgres; uuid-ossp quedaría instalada en un solo schema.
  uuidExtension: 'pgcrypto',
  installExtensions: false,
});
