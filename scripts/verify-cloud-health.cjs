const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { ROOT, SERVICES } = require('./supabase-config.cjs');
const run = promisify(execFile);
const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';

async function main() {
  const project = process.env.COMPOSE_PROJECT_NAME || path.basename(ROOT);
  const results = [];
  for (const service of SERVICES) {
    const lookup = await run(docker, [
      'ps',
      '--filter',
      'label=com.docker.compose.project=' + project,
      '--filter',
      'label=com.docker.compose.service=' + service.name,
      '--format',
      '{{.ID}}',
    ]);
    const ids = lookup.stdout.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(ids.length, 1, 'Se esperaba un contenedor activo para ' + service.name);
    const container = ids[0];
    const inspection = JSON.parse((await run(docker, ['inspect', container])).stdout)[0];
    if (service.name !== 'gateway') {
      assert.ok(
        Object.values(inspection.NetworkSettings.Ports || {}).every((bindings) => !bindings || bindings.length === 0),
        'Puerto publicado en ' + service.name,
      );
    }
    const port =
      service.name === 'gateway'
        ? 8080
        : 3001 + SERVICES.filter((s) => s.name !== 'gateway').findIndex((s) => s.name === service.name);
    const response = (
      await run(docker, [
        'exec',
        container,
        'curl',
        '-sS',
        '--max-time',
        '10',
        '-w',
        '\n%{http_code}',
        'http://localhost:' + port + '/health',
      ])
    ).stdout;
    const split = response.lastIndexOf('\n');
    const status = Number(response.slice(split + 1));
    assert.equal(status, 200, 'Health incorrecto en ' + service.name);
    const body = JSON.parse(response.slice(0, split));
    const modulePath =
      service.name === 'gateway'
        ? './gateway/dist/data-source.js'
        : './services/' + service.name + '/dist/data-source.js';
    // Lee la identidad de la conexión real sin imprimir la URL ni las claves.
    const probe =
      'const {AppDataSource:ds}=require(' +
      JSON.stringify(modulePath) +
      ');' +
      '(async()=>{try{await ds.initialize();const c=await ds.driver.master.connect();try{' +
      'const r=await c.query("SELECT current_user AS role, current_schema() AS schema, current_database() AS database");' +
      'const stream=c.connection.stream;' +
      'console.log(JSON.stringify({...r.rows[0],host:c.connectionParameters.host,projectRef:c.connectionParameters.user.split(".").slice(1).join("."),tlsEncrypted:stream.encrypted===true,tlsAuthorized:stream.authorized===true,poolMax:ds.driver.master.options.max,synchronize:ds.options.synchronize}));' +
      '}finally{c.release();}}catch(e){console.error(JSON.stringify({code:e.code||"ERROR"}));process.exitCode=1;}finally{if(ds.isInitialized)await ds.destroy();}})();';
    const identity = JSON.parse((await run(docker, ['exec', container, 'node', '-e', probe])).stdout.trim());
    assert.equal(identity.role, service.role);
    assert.equal(identity.schema, service.schema);
    assert.equal(identity.database, 'postgres');
    assert.ok(identity.host.endsWith('.pooler.supabase.com'));
    assert.equal(identity.tlsEncrypted, true);
    assert.equal(identity.tlsAuthorized, true);
    assert.ok(identity.poolMax >= 1 && identity.poolMax <= 5);
    assert.equal(identity.synchronize, false);
    results.push({ service: service.name, status, body, ...identity, hostPortsPublished: service.name === 'gateway' });
    console.log('OK: ' + service.name + ', health=200, rol=' + identity.role + ', TLS verificado.');
  }
  assert.ok(
    results.every((result) => result.projectRef && result.projectRef === results[0].projectRef),
    'Los servicios no usan el mismo proyecto Supabase',
  );
  const gatewayResponse = await fetch('http://localhost:8080/health', { signal: AbortSignal.timeout(10000) });
  assert.equal(gatewayResponse.status, 200);
  await gatewayResponse.text();
  const report = {
    checkedAt: new Date().toISOString(),
    project,
    destination: 'Supabase Session Pooler',
    projectRef: results[0].projectRef,
    results,
    gatewayHostHealth: 200,
  };
  const filename = path.join(ROOT, 'docs/Sprints/1/HU3/CA03-supabase-health-evidencia.json');
  fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
  console.log('OK: seis healthchecks y conexión real verificados. Evidencia guardada sin credenciales.');
}
main().catch((error) => {
  // Los errores de execFile pueden incluir argumentos: no imprimir el comando completo.
  const message = String(
    error.cmd ? 'Fallo al ejecutar Docker; comprobar contenedor y conexion.' : error.message || '',
  ).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_URL]');
  console.error(
    'ERROR: verificacion incompleta (' + (error.code || error.name || 'ERROR') + '): ' + message.slice(0, 1500),
  );
  process.exitCode = 1;
});
