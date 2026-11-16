import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { errorHandler, EstadoContrato, EstadoFuncionario, TipoContrato, type FuncionarioContrato } from '@arca/shared';
import { ContratoPdf } from '../../src/entities/contrato-pdf.entity';
import { Contrato } from '../../src/entities/contrato.entity';
import { PlantillaVersion } from '../../src/entities/plantilla-version.entity';
import { Plantilla } from '../../src/entities/plantilla.entity';
import { createContratoRouter } from '../../src/routes/contrato.routes';
import { ContratoService } from '../../src/services/contrato.service';

const ID_FUNCIONARIO = '11111111-1111-4111-8111-111111111103';
const ID_RRHH = '11111111-1111-4111-8111-111111111104';
const ID_PLANTILLA = '22222222-2222-4222-8222-222222222201';
const ID_VERSION = '33333333-3333-4333-8333-333333333301';

const CONTENIDO_PLANTILLA = `
CONTRATO DE TRABAJO
Entre {{empresa.razon_social}} y {{funcionario.nombre_completo}} con C.I. {{funcionario.ci}}.
Fecha de ingreso: {{funcionario.fecha_ingreso}}.
Período de prueba: {{funcionario.dias_prueba}} días.
Cargo: {{asignacion.cargo}} en el área de {{asignacion.area}}.
Remuneración mensual: Bs. {{asignacion.remuneracion}} ({{asignacion.remuneracion_literal}}).
Emitido el: {{fecha_emision}}.
`.trim();

function fixtureFuncionario(parcial: Partial<FuncionarioContrato> = {}): FuncionarioContrato {
  return {
    id: ID_FUNCIONARIO,
    usuarioId: null,
    nombres: 'Daniela',
    apellidos: 'Mendoza Vargas',
    documentoIdentidad: '7492015 LP',
    fechaIngreso: '2026-11-01',
    diasPrueba: 90,
    fechaRatificacion: null,
    fechaBaja: null,
    area: 'Tecnología',
    cargo: 'Ingeniera de Software',
    remuneracion: { monto: 9500, moneda: 'BOB' },
    estado: EstadoFuncionario.EN_PRUEBA,
    ...parcial,
  };
}

function fixturePlantilla(): { plantilla: Plantilla; version: PlantillaVersion } {
  const plantilla = Object.assign(new Plantilla(), {
    id: ID_PLANTILLA,
    codigo: 'PL-IND-01',
    nombre: 'Contrato a Plazo Indefinido',
    tipo: TipoContrato.INDEFINIDO,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const version = Object.assign(new PlantillaVersion(), {
    id: ID_VERSION,
    plantillaId: ID_PLANTILLA,
    plantilla,
    version: 1,
    activa: true,
    contenido: CONTENIDO_PLANTILLA,
    createdAt: new Date(),
  });

  return { plantilla, version };
}

function setupTestEnvironment(opciones: { funcionario?: FuncionarioContrato; contratosIniciales?: Contrato[] } = {}) {
  const { plantilla, version } = fixturePlantilla();
  const funcionario = opciones.funcionario ?? fixtureFuncionario();
  const contratos: Contrato[] = [...(opciones.contratosIniciales ?? [])];
  const contratosPdf: ContratoPdf[] = [];
  let seqCorrelativo = 0;

  const mockContratoRepo = {
    findById: async (id: string) => contratos.find((c) => c.id === id) ?? null,
    findByNumero: async (numero: string) => contratos.find((c) => c.numero === numero) ?? null,
    findByFuncionario: async (fId: string) => contratos.filter((c) => c.funcionarioId === fId),
    findVigenteByFuncionario: async (fId: string) =>
      contratos.find((c) => c.funcionarioId === fId && c.estado === EstadoContrato.VIGENTE) ?? null,
    findAll: async () => contratos,
    findConFiltros: async (filtros: any = {}) => {
      let res = [...contratos];
      if (filtros.funcionarioId) res = res.filter((c) => c.funcionarioId === filtros.funcionarioId);
      if (filtros.plantillaId) res = res.filter((c) => c.plantillaVersion?.plantillaId === filtros.plantillaId);
      if (filtros.estado) res = res.filter((c) => c.estado === filtros.estado);
      return res;
    },
    save: async (entity: Contrato) => {
      if (!entity.id) entity.id = randomUUID();
      const idx = contratos.findIndex((c) => c.id === entity.id);
      if (idx >= 0) contratos[idx] = entity;
      else contratos.push(entity);
      return entity;
    },
  };

  const mockContratoPdfRepo = {
    findById: async (cId: string) => contratosPdf.find((p) => p.contratoId === cId) ?? null,
    findByIdWithContent: async (cId: string) => contratosPdf.find((p) => p.contratoId === cId) ?? null,
    findAll: async () => contratosPdf,
    save: async (entity: ContratoPdf) => {
      const idx = contratosPdf.findIndex((p) => p.contratoId === entity.contratoId);
      if (idx >= 0) contratosPdf[idx] = entity;
      else contratosPdf.push(entity);
      return entity;
    },
  };

  const mockPlantillaRepo = {
    findById: async (id: string) => (id === ID_PLANTILLA ? plantilla : null),
    findByCodigo: async () => null,
    findAll: async () => [plantilla],
    save: async (p: Plantilla) => p,
  };

  const mockPlantillaVersionRepo = {
    findById: async (id: string) => (id === ID_VERSION ? version : null),
    findActiveByPlantillaId: async (pId: string) => (pId === ID_PLANTILLA ? version : null),
    findAllByPlantillaId: async () => [version],
    getLatestVersionNumber: async () => 1,
    save: async (v: PlantillaVersion) => v,
  };

  const mockCorrelativoRepo = {
    findById: async () => null,
    findAll: async () => [],
    obtenerSiguiente: async () => {
      seqCorrelativo += 1;
      return seqCorrelativo;
    },
    save: async () => {},
  };

  const mockPersonalClient = {
    getFuncionario: async (id: string) => (id === funcionario.id ? funcionario : null),
  };

  const mockPdfClient = {
    generarPdf: async (html: string) => Buffer.from(`%PDF-1.4\n${html}\n%%EOF`, 'utf-8'),
  };

  const fakeTransaction = async <T>(fn: (em: any) => Promise<T>): Promise<T> => {
    return fn({});
  };

  const service = new ContratoService(
    mockContratoRepo as any,
    mockContratoPdfRepo as any,
    mockPlantillaRepo as any,
    mockPlantillaVersionRepo as any,
    mockCorrelativoRepo as any,
    mockPersonalClient,
    mockPdfClient,
    fakeTransaction,
    () => new Date('2026-11-14T10:00:00Z'),
  );

  const app = express();
  app.use(express.json(), createContratoRouter(service), errorHandler);

  return { app, service, contratos, contratosPdf, funcionario };
}

describe('HU-18 Generar contrato de un funcionario', () => {
  it('CA-01 y CA-02: genera vista previa con datos reales de ms-personal antes de confirmar', async () => {
    const { app } = setupTestEnvironment();

    const response = await request(app)
      .post('/preview')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .send({ funcionarioId: ID_FUNCIONARIO, plantillaId: ID_PLANTILLA })
      .expect(200);

    expect(response.body.funcionario.nombreCompleto).toBe('Daniela Mendoza Vargas');
    expect(response.body.funcionario.cargo).toBe('Ingeniera de Software');
    expect(response.body.funcionario.remuneracion).toBe(9500);

    // CA-02: El contenido renderizado tiene los datos reales reemplazados
    expect(response.body.contenidoRenderizado).toContain('Daniela Mendoza Vargas');
    expect(response.body.contenidoRenderizado).toContain('7492015 LP');
    expect(response.body.contenidoRenderizado).toContain('Bs. 9500');
    expect(response.body.contenidoRenderizado).toContain('NUEVE MIL QUINIENTOS');
  });

  it('CA-03: no se puede generar contrato para un funcionario de baja (400)', async () => {
    const funcionarioDeBaja = fixtureFuncionario({ estado: EstadoFuncionario.BAJA });
    const { app } = setupTestEnvironment({ funcionario: funcionarioDeBaja });

    const resPreview = await request(app)
      .post('/preview')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .send({ funcionarioId: ID_FUNCIONARIO })
      .expect(400);

    expect(resPreview.body.message).toContain('baja');

    const resGenerar = await request(app)
      .post('/')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .send({ funcionarioId: ID_FUNCIONARIO })
      .expect(400);

    expect(resGenerar.body.message).toContain('baja');
  });

  it('CA-04, CA-05 y CA-07: genera contrato con correlativo CT-AAAA-NNNN, hash SHA-256 de 64 chars y PDF', async () => {
    const { app, contratos, contratosPdf } = setupTestEnvironment();

    const response = await request(app)
      .post('/')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .send({ funcionarioId: ID_FUNCIONARIO, plantillaId: ID_PLANTILLA })
      .expect(201);

    expect(response.body.numero).toBe('CT-2026-0001');
    expect(response.body.version).toBe(1);
    expect(response.body.estado).toBe(EstadoContrato.VIGENTE);
    expect(response.body.hashSha256).toHaveLength(64);
    expect(response.body.datos.funcionario.nombre_completo).toBe('Daniela Mendoza Vargas');

    expect(contratos).toHaveLength(1);
    expect(contratosPdf).toHaveLength(1);
    expect(contratosPdf[0].contratoId).toBe(response.body.id);
    expect(contratosPdf[0].tamanoBytes).toBeGreaterThan(0);
  });

  it('CA-06: si ya tenía contrato, el nuevo es versión 2 y el anterior pasa a REEMPLAZADO', async () => {
    const contratoPrevio = Object.assign(new Contrato(), {
      id: 'contrato-previo-id',
      numero: 'CT-2026-0001',
      funcionarioId: ID_FUNCIONARIO,
      plantillaVersionId: ID_VERSION,
      version: 1,
      estado: EstadoContrato.VIGENTE,
      datos: {},
      contenidoRenderizado: 'Contrato v1',
      hashSha256: 'a'.repeat(64),
      generadoPor: ID_RRHH,
      createdAt: new Date('2026-01-01'),
    });

    const { app, contratos } = setupTestEnvironment({
      contratosIniciales: [contratoPrevio],
    });

    const response = await request(app)
      .post('/')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .send({ funcionarioId: ID_FUNCIONARIO })
      .expect(201);

    expect(response.body.numero).toBe('CT-2026-0001'); // Primer seq en el mock
    expect(response.body.version).toBe(2);
    expect(response.body.estado).toBe(EstadoContrato.VIGENTE);

    // El previo ahora está REEMPLAZADO
    const previoActualizado = contratos.find((c) => c.id === 'contrato-previo-id');
    expect(previoActualizado?.estado).toBe(EstadoContrato.REEMPLAZADO);
  });

  it('permisos: solo RRHH y ADMIN pueden generar contratos (403 para FUNCIONARIO y 401 sin auth)', async () => {
    const { app } = setupTestEnvironment();

    await request(app)
      .post('/')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', 'user-1')
      .send({ funcionarioId: ID_FUNCIONARIO })
      .expect(403);

    await request(app).post('/').send({ funcionarioId: ID_FUNCIONARIO }).expect(401);
  });

  it('descarga de PDF: endpoint GET /contratos/:id/pdf devuelve el buffer binario', async () => {
    const { app, service } = setupTestEnvironment();
    const generado = await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);

    const res = await request(app)
      .get(`/${generado.id}/pdf`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(`Contrato-${generado.numero}.pdf`);
    expect(res.body).toBeInstanceOf(Buffer);
  });

  it('listar contratos: endpoint GET /contratos devuelve lista de contratos emitidos persistidos', async () => {
    const { app, service } = setupTestEnvironment();
    await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);

    const res = await request(app).get('/').set('x-user-rol', 'RRHH').set('x-user-id', ID_RRHH).expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].numero).toMatch(/^CT-\d{4}-\d{4}$/);
  });

  describe('HU-19 Consultar y descargar contratos', () => {
    it('CA-01: RRHH lista contratos con filtros', async () => {
      const { app, service } = setupTestEnvironment();
      await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);

      const res = await request(app)
        .get(`/?funcionarioId=${ID_FUNCIONARIO}&estado=VIGENTE`)
        .set('x-user-rol', 'RRHH')
        .set('x-user-id', ID_RRHH)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].funcionarioId).toBe(ID_FUNCIONARIO);
    });

    it('CA-02: FUNCIONARIO solo puede ver y descargar sus propios contratos (403 si accede a otro)', async () => {
      const { app, service } = setupTestEnvironment();
      const contrato = await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);

      // Con su propio funcionarioId asociado -> 200 OK
      const resPropio = await request(app)
        .get(`/${contrato.id}`)
        .set('x-user-rol', 'FUNCIONARIO')
        .set('x-user-id', 'user-1')
        .set('x-funcionario-id', ID_FUNCIONARIO)
        .expect(200);

      expect(resPropio.body.id).toBe(contrato.id);

      // Con funcionarioId de otro usuario -> 403 Forbidden
      const OTRO_ID = '99999999-9999-4999-8999-999999999999';
      await request(app)
        .get(`/${contrato.id}`)
        .set('x-user-rol', 'FUNCIONARIO')
        .set('x-user-id', 'user-2')
        .set('x-funcionario-id', OTRO_ID)
        .expect(403);

      // Descarga de PDF de otro funcionario -> 403 Forbidden
      await request(app)
        .get(`/${contrato.id}/pdf`)
        .set('x-user-rol', 'FUNCIONARIO')
        .set('x-user-id', 'user-2')
        .set('x-funcionario-id', OTRO_ID)
        .expect(403);
    });

    it('CA-03: La descarga entrega el PDF guardado y verifica que el hash SHA-256 coincida', async () => {
      const { app, service } = setupTestEnvironment();
      const contrato = await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);

      // Descarga normal con hash íntegro -> 200 OK
      const res = await request(app)
        .get(`/${contrato.id}/pdf`)
        .set('x-user-rol', 'RRHH')
        .set('x-user-id', ID_RRHH)
        .expect(200);

      expect(res.body).toBeInstanceOf(Buffer);

      // Si el hash fue alterado o corrompido en el registro -> 500 Error de integridad
      contrato.hashSha256 = '0000000000000000000000000000000000000000000000000000000000000000';
      await request(app).get(`/${contrato.id}/pdf`).set('x-user-rol', 'RRHH').set('x-user-id', ID_RRHH).expect(500);
    });

    it('CA-04: La ficha del contrato muestra su historial de versiones', async () => {
      const { app, service } = setupTestEnvironment();
      // Generar v1
      await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);
      // Generar v2 (reemplaza v1)
      const v2 = await service.generar(ID_FUNCIONARIO, ID_PLANTILLA, ID_RRHH);

      const res = await request(app).get(`/${v2.id}`).set('x-user-rol', 'RRHH').set('x-user-id', ID_RRHH).expect(200);

      expect(res.body.id).toBe(v2.id);
      expect(res.body.version).toBe(2);
      expect(res.body.estado).toBe('VIGENTE');
      expect(Array.isArray(res.body.historialVersiones)).toBe(true);
      expect(res.body.historialVersiones.length).toBe(2);
      expect(res.body.historialVersiones[0].version).toBe(2);
      expect(res.body.historialVersiones[1].version).toBe(1);
      expect(res.body.historialVersiones[1].estado).toBe('REEMPLAZADO');
    });
  });
});
