// Crea los 6 schemas si no existen. Sirve para CI y para una base local ya inicializada.
const { Client } = require('pg');

const SCHEMAS = ['autenticacion', 'personal', 'vacaciones', 'contratos', 'boletas', 'auditoria'];

async function main() {
  const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/arca';
  const client = new Client({ connectionString });

  await client.connect();
  try {
    for (const schema of SCHEMAS) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
    console.log(`[db:schemas] Listos: ${SCHEMAS.join(', ')}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[db:schemas] Falló:', error.message);
  process.exit(1);
});
