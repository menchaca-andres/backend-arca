const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { ROOT, SERVICES, loadConfig, connectionOptions, safeError } = require('./supabase-config.cjs');

async function main() {
  let config;
  const results = [];
  try {
    config = loadConfig();
    for (const service of SERVICES) {
      const client = new Client(connectionOptions(config, service.role, config.values[service.key], 'verify'));
      try {
        await client.connect();
        const identity = (await client.query('SELECT current_user AS role')).rows[0].role;
        assert.equal(identity, service.role, 'La conexion no usa el rol esperado');
        const denied = [];
        let ownTablesChecked = 0;
        let deniedTablesChecked = 0;
        const quote = (value) => '"' + value.replace(/"/g, '""') + '"';
        for (const target of SERVICES) {
          const rights = (
            await client.query(
              "SELECT has_schema_privilege(current_user, $1, 'USAGE') AS usage, has_schema_privilege(current_user, $1, 'CREATE') AS create",
              [target.schema],
            )
          ).rows[0];
          assert.equal(rights.usage, target.schema === service.schema, 'USAGE incorrecto: ' + target.schema);
          assert.equal(rights.create, false, 'CREATE inesperado: ' + target.schema);
          const tables = (
            await client.query(
              "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p') ORDER BY c.relname",
              [target.schema],
            )
          ).rows;
          assert.ok(
            tables.some((table) => table.relname === target.table),
            'Falta la tabla esperada en ' + target.schema,
          );
          for (const table of tables) {
            const sql = 'SELECT 1 FROM ' + quote(target.schema) + '.' + quote(table.relname) + ' LIMIT 0';
            if (target.schema === service.schema) {
              await client.query(sql);
              ownTablesChecked++;
            } else {
              let code;
              try {
                await client.query(sql);
              } catch (error) {
                code = error.code;
              }
              assert.equal(
                code,
                '42501',
                'No se acredito rechazo por permisos para ' + target.schema + '.' + table.relname,
              );
              deniedTablesChecked++;
            }
          }
          if (target.schema !== service.schema) denied.push(target.schema);
        }
        const privileges = (
          await client.query(
            "SELECT has_table_privilege(current_user, $1, 'SELECT') AS read, has_table_privilege(current_user, $1, 'INSERT') AS insert, has_table_privilege(current_user, $1, 'UPDATE') AS update, has_table_privilege(current_user, $1, 'DELETE') AS delete",
            [service.schema + '.' + service.table],
          )
        ).rows[0];
        assert.equal(privileges.read, true);
        assert.equal(privileges.insert, true);
        assert.equal(privileges.update, service.name !== 'gateway');
        assert.equal(privileges.delete, service.name !== 'gateway');
        const sequences = (
          await client.query(
            "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relkind = 'S'",
            [service.schema],
          )
        ).rows;
        for (const sequence of sequences) {
          const allowed = (
            await client.query("SELECT has_sequence_privilege(current_user, $1, 'USAGE') AS usage", [
              service.schema + '.' + sequence.relname,
            ])
          ).rows[0].usage;
          assert.equal(allowed, true, 'Falta USAGE en secuencia');
        }
        results.push({
          service: service.name,
          role: identity,
          schema: service.schema,
          ownRead: true,
          ownTablesChecked,
          deniedTablesChecked,
          tlsVerified: true,
          deniedSchemas: denied,
          privileges,
          sequencesChecked: sequences.length,
        });
        console.log('OK: ' + service.name + ', acceso propio y rechazo a los otros cinco schemas.');
      } finally {
        await client.end().catch(() => {});
      }
    }
    const report = {
      checkedAt: new Date().toISOString(),
      destination: 'Supabase Session Pooler',
      projectRef: config.values.SUPABASE_PROJECT_REF,
      poolerHost: config.values.SUPABASE_POOLER_HOST,
      scope:
        'Aislamiento de datos entre los seis schemas ARCA; no certifica ausencia de todos los privilegios PUBLIC de la plataforma.',
      results,
    };
    const filename = path.join(ROOT, 'docs/Sprints/1/HU3/CA03-supabase-evidencia.json');
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log('OK: evidencia guardada; no incluye passwords ni cadenas de conexion.');
  } catch (error) {
    console.error(safeError(error, config));
    process.exitCode = 1;
    console.error('Verificacion incompleta: no se genera una nueva evidencia satisfactoria.');
  }
}
main();
