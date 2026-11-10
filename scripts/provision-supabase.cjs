const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { ROOT, SERVICES, loadConfig, connectionOptions, safeError } = require('./supabase-config.cjs');

async function main() {
  let config;
  let client;
  try {
    config = loadConfig();
    client = new Client(connectionOptions(config, 'postgres', config.values.SUPABASE_ADMIN_PASSWORD, 'provision'));
    await client.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL password_encryption = 'scram-sha-256'");
    const passwords = Object.fromEntries(SERVICES.map((service) => [service.role, config.values[service.key]]));
    // Parametro enlazado; no imprimir el resultado de set_config.
    await client.query("SELECT set_config('arca.bootstrap_passwords', $1, true)", [JSON.stringify(passwords)]);
    await client.query(fs.readFileSync(path.join(ROOT, 'docker/supabase-init-schemas.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('OK: seis schemas y roles ARCA provisionados. No se aplicaron migraciones ni se modificaron .env.');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(safeError(error, config));
    process.exitCode = 1;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}
main();
