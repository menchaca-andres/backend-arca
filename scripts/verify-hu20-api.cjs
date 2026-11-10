// Ejecutar solo desde verify-hu20-local.ps1 contra la base local dedicada.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const request = require('supertest');
const serviceRoot = path.resolve(__dirname, '../services/ms-boletas');
const { AppDataSource } = require(path.join(serviceRoot, 'dist/data-source'));
const { app } = require(path.join(serviceRoot, 'dist/app'));
const { ConfiguracionRepository } = require(path.join(serviceRoot, 'dist/repositories/configuracion.repository'));

async function main() {
  const destination = new URL(process.env.DATABASE_URL);
  assert.equal(destination.hostname, '127.0.0.1');
  assert.equal(destination.port, '55420');
  assert.equal(destination.pathname, '/arca_hu20_test');
  const id = '11111111-1111-4111-8111-111111111111';
  const identity = { 'x-user-id': id, 'x-user-rol': 'RRHH' };
  // Dependencia simulada en la prueba: no consulta Personal ni funcionarios reales.
  const personal = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
      res.writeHead(401);
      res.end(JSON.stringify({ code: 'UNAUTHORIZED' }));
      return;
    }
    if (req.url !== `/internal/funcionarios/${id}`) {
      res.writeHead(404);
      res.end(JSON.stringify({ code: 'NOT_FOUND' }));
      return;
    }
    res.end(JSON.stringify({ id }));
  });
  await new Promise((resolve, reject) => {
    personal.once('error', reject);
    personal.listen(0, '127.0.0.1', resolve);
  });
  process.env.PERSONAL_SERVICE_URL = `http://127.0.0.1:${personal.address().port}`;
  try {
    await AppDataSource.initialize();
    const repo = new ConfiguracionRepository();
    const datos = {
      codigo: `API-${Date.now()}`,
      nombre: 'Bono de prueba',
      tipo: 'HABER',
      formaCalculo: 'MONTO_FIJO',
      valor: 100,
      base: null,
      automatico: false,
      orden: 1,
    };
    const creada = await request(app).post('/conceptos').set(identity).send(datos).expect(201);
    const conceptoId = creada.body.id;
    const novedad = { anio: 2026, mes: 11, funcionarioId: id, conceptoId, monto: 125.5 };
    await request(app).post('/novedades').set(identity).send(novedad).expect(201);
    await request(app).post('/novedades').set(identity).send(novedad).expect(409);
    const novedades = await request(app)
      .get(`/novedades?anio=2026&mes=11&funcionarioId=${id}`)
      .set(identity)
      .expect(200);
    assert.equal(novedades.body.length, 1);
    assert.equal(novedades.body[0].monto, 125.5);
    await request(app)
      .post('/novedades')
      .set(identity)
      .send({ ...novedad, funcionarioId: '22222222-2222-4222-8222-222222222222' })
      .expect(404);
    await request(app).delete(`/conceptos/${conceptoId}`).set(identity).expect(409);
    await request(app).patch(`/conceptos/${conceptoId}/estado`).set(identity).send({ activo: false }).expect(200);
    await request(app)
      .post('/novedades')
      .set(identity)
      .send({ ...novedad, mes: 12 })
      .expect(409);
    await request(app).get('/conceptos').expect(401);
    await request(app)
      .get('/conceptos')
      .set({ ...identity, 'x-user-rol': 'FUNCIONARIO' })
      .expect(403);
    console.log('API con persistencia real OK; dependencia Personal simulada y protegida por clave.');

    const seed = () =>
      execFileSync(process.execPath, ['dist/seeds/conceptos.seed.js'], {
        cwd: serviceRoot,
        env: process.env,
        stdio: 'inherit',
      });
    seed();
    seed();
    let catalogo = await repo.listarConceptos(true);
    const basicos = catalogo.filter((c) => c.codigo === 'HABER_BASICO');
    assert.equal(basicos.length, 1);
    assert.equal(basicos[0].esSistema, true);
    const aportes = catalogo.filter((c) => c.codigo === 'APORTE_LABORAL');
    assert.equal(aportes.length, 1);
    assert.equal(aportes[0].valor, 12.71);
    await request(app).patch(`/conceptos/${basicos[0].id}/estado`).set(identity).send({ activo: false }).expect(403);
    await request(app).delete(`/conceptos/${basicos[0].id}`).set(identity).expect(403);
    const aporte = aportes[0];
    await repo.actualizarConcepto(aporte.id, {
      nombre: aporte.nombre,
      tipo: aporte.tipo,
      formaCalculo: aporte.formaCalculo,
      valor: 10,
      base: aporte.base,
      automatico: aporte.automatico,
      orden: aporte.orden,
    });
    seed();
    catalogo = await repo.listarConceptos(true);
    assert.equal(catalogo.find((c) => c.id === aporte.id).valor, 10);
    console.log('Semillas idempotentes, Haber basico protegido y politica editada conservada OK.');
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    await new Promise((resolve) => personal.close(resolve));
  }
}
main().catch(() => {
  console.error('Fallo en el comprobador HU-20. Revisar la operacion anterior.');
  process.exitCode = 1;
});
