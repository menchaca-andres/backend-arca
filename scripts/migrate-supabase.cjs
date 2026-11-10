const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { ROOT, SERVICES, loadConfig, connectionOptions, safeError } = require('./supabase-config.cjs');

async function main() {
  let config;
  try {
    config = loadConfig();
    // Migrar como administrador: los roles de runtime no tienen CREATE.
    for (const service of SERVICES) {
      const directory = path.join(
        ROOT,
        service.name === 'gateway' ? 'gateway' : 'services/' + service.name,
        'dist/migrations',
      );
      if (!fs.existsSync(directory) || !fs.readdirSync(directory).some((file) => file.endsWith('.js'))) {
        throw new Error('Faltan migraciones compiladas para ' + service.name + '; ejecutar npm run build');
      }
    }
    for (const service of SERVICES) {
      const connection = connectionOptions(config, 'postgres', config.values.SUPABASE_ADMIN_PASSWORD, 'migrate');
      const dataSource = new DataSource({
        type: 'postgres',
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.user,
        password: connection.password,
        ssl: connection.ssl,
        schema: service.schema,
        synchronize: false,
        logging: false,
        installExtensions: false,
        uuidExtension: 'pgcrypto',
        connectTimeoutMS: 10000,
        extra: { query_timeout: 30000 },
        entities: [],
        migrationsTableName: 'migrations',
        migrations: [
          path.join(ROOT, service.name === 'gateway' ? 'gateway' : 'services/' + service.name, 'dist/migrations/*.js'),
        ],
      });
      try {
        await dataSource.initialize();
        const applied = await dataSource.runMigrations({ transaction: 'all' });
        console.log('OK: ' + service.name + ', ' + applied.length + ' migraciones aplicadas.');
      } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
      }
    }
  } catch (error) {
    console.error(safeError(error, config));
    process.exitCode = 1;
  }
}
main();
