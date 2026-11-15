import express from 'express';
import request from 'supertest';
import { errorHandler, EstadoFuncionario, EstadoSolicitud } from '@arca/shared';
import { listarFeriados } from '../src/domain/feriados';
import { SolicitudVacacion } from '../src/entities/solicitud-vacacion.entity';
import { createVacacionesRouter } from '../src/routes/vacaciones.routes';
import { VacacionesService } from '../src/services/vacaciones.service';

const ID_FUNCIONARIO = '11111111-1111-4111-8111-111111111103';
const ID_OTRO_FUNCIONARIO = '11111111-1111-4111-8111-111111111101';
const ID_RRHH = '11111111-1111-4111-8111-111111111104';
const ID_ADMIN = '11111111-1111-4111-8111-111111111102';

function crearSolicitud(parcial: Partial<SolicitudVacacion> = {}): SolicitudVacacion {
  return Object.assign(new SolicitudVacacion(), {
    id: '11111111-1111-4111-8111-111111111201',
    funcionarioId: ID_FUNCIONARIO,
    funcionarioNombre: 'Daniela Mendoza Vargas',
    fechaInicio: '2026-11-15',
    fechaFin: '2026-11-20',
    diasHabiles: 5,
    estado: EstadoSolicitud.APROBADA,
    motivoRechazo: null,
    registradoPor: ID_RRHH,
    resueltoPor: ID_RRHH,
    fechaResolucion: new Date('2026-11-10T14:00:00Z'),
    createdAt: new Date('2026-11-10T12:00:00Z'),
    ...parcial,
  });
}

function crearApp(
  opciones: {
    estado?: EstadoFuncionario;
    fechaIngreso?: string;
    solicitudes?: SolicitudVacacion[];
  } = {},
) {
  const solicitudes = opciones.solicitudes ?? [crearSolicitud()];
  const repository = {
    findAll: async () => solicitudes,
    findById: async (id: string) => solicitudes.find((item) => item.id === id) ?? null,
    findPendientes: async () => solicitudes.filter((item) => item.estado === EstadoSolicitud.PENDIENTE),
    findByFuncionario: async (id: string) => solicitudes.filter((item) => item.funcionarioId === id),
    findOverlapping: async () => null,
    findAprobadasRango: async (desde: string, hasta: string) =>
      solicitudes.filter(
        (item) => item.estado === EstadoSolicitud.APROBADA && item.fechaInicio <= hasta && item.fechaFin >= desde,
      ),
    save: async (entity: SolicitudVacacion) => entity,
  };
  const personal = {
    getFuncionario: async (id: string) => {
      if (id === ID_FUNCIONARIO) {
        return {
          id,
          nombreCompleto: 'Daniela Mendoza Vargas',
          fechaIngreso: opciones.fechaIngreso ?? '2024-03-10',
          estado: opciones.estado ?? EstadoFuncionario.RATIFICADO,
        };
      }
      if (id === ID_OTRO_FUNCIONARIO) {
        return {
          id,
          nombreCompleto: 'Carlos Mamani Flores',
          fechaIngreso: '2023-01-15',
          estado: EstadoFuncionario.RATIFICADO,
        };
      }
      return null;
    },
  };
  const service = new VacacionesService(
    repository,
    personal,
    { findByYear: async (anio: number) => listarFeriados(anio) },
    () => '2026-11-14',
  );
  const app = express();
  app.use(express.json(), createVacacionesRouter(service), errorHandler);
  return { app, solicitudes };
}

describe('HU-16 Historial (Kardex) de vacaciones', () => {
  it('CA-01: lista por gestión con días ganados, solicitudes, días, estado y quién resolvió', async () => {
    const solGestion1 = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111202',
      fechaInicio: '2024-06-10',
      fechaFin: '2024-06-14',
      diasHabiles: 5,
      estado: EstadoSolicitud.APROBADA,
      resueltoPor: ID_RRHH,
      fechaResolucion: new Date('2024-06-01T10:00:00Z'),
    });
    const solGestion2 = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111203',
      fechaInicio: '2025-08-01',
      fechaFin: '2025-08-05',
      diasHabiles: 5,
      estado: EstadoSolicitud.APROBADA,
      resueltoPor: ID_RRHH,
      fechaResolucion: new Date('2025-07-20T10:00:00Z'),
    });
    const solEnCurso = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111204',
      fechaInicio: '2026-11-20',
      fechaFin: '2026-11-25',
      diasHabiles: 4,
      estado: EstadoSolicitud.PENDIENTE,
      resueltoPor: null,
      fechaResolucion: null,
    });

    const { app } = crearApp({
      fechaIngreso: '2024-03-10',
      solicitudes: [solGestion1, solGestion2, solEnCurso],
    });

    const response = await request(app)
      .get(`/historial/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(200);

    expect(response.body.funcionarioId).toBe(ID_FUNCIONARIO);
    expect(response.body.gestionesCumplidas).toBe(2);
    expect(response.body.diasGanadosTotal).toBe(30); // 2 * 15
    expect(response.body.diasUsadosTotal).toBe(10);
    expect(response.body.diasReservadosTotal).toBe(4);
    expect(response.body.diasDisponiblesTotal).toBe(16);

    expect(response.body.gestiones.length).toBeGreaterThanOrEqual(2);
    const g1 = response.body.gestiones[0];
    expect(g1.numero).toBe(1);
    expect(g1.diasGanados).toBe(15);
    expect(g1.solicitudes.length).toBe(1);
    expect(g1.solicitudes[0]).toMatchObject({
      id: solGestion1.id,
      diasHabiles: 5,
      estado: EstadoSolicitud.APROBADA,
      resueltoPor: ID_RRHH,
    });
  });

  it('CA-02: permite filtrar por estado y por año', async () => {
    const solAprobada2025 = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111205',
      fechaInicio: '2025-04-10',
      fechaFin: '2025-04-15',
      estado: EstadoSolicitud.APROBADA,
    });
    const solRechazada2025 = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111206',
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-05',
      estado: EstadoSolicitud.RECHAZADA,
      motivoRechazo: 'Cruce con cierre contable',
    });
    const solAprobada2026 = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111207',
      fechaInicio: '2026-05-10',
      fechaFin: '2026-05-15',
      estado: EstadoSolicitud.APROBADA,
    });

    const { app } = crearApp({
      solicitudes: [solAprobada2025, solRechazada2025, solAprobada2026],
    });

    // Filtro por estado APROBADA
    const resAprobadas = await request(app)
      .get(`/historial/${ID_FUNCIONARIO}?estado=APROBADA`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(200);

    const todasVisiblesAprobadas = resAprobadas.body.gestiones.flatMap(
      (g: { solicitudes: Array<{ estado: string }> }) => g.solicitudes,
    );
    expect(todasVisiblesAprobadas.every((s: { estado: string }) => s.estado === 'APROBADA')).toBe(true);

    // Filtro por año 2026
    const resAnio2026 = await request(app)
      .get(`/historial/${ID_FUNCIONARIO}?anio=2026`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(200);

    const todasVisibles2026 = resAnio2026.body.gestiones.flatMap(
      (g: { solicitudes: Array<{ fechaInicio: string }> }) => g.solicitudes,
    );
    expect(todasVisibles2026.every((s: { fechaInicio: string }) => s.fechaInicio.startsWith('2026'))).toBe(true);
  });

  it('CA-03: un FUNCIONARIO solo puede ver su propio historial y no el de otros', async () => {
    const { app } = crearApp();

    // Consulta de su propio historial -> 200 OK
    await request(app)
      .get(`/historial/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .set('x-user-id', 'user-funcionario-1')
      .expect(200);

    // Intento de consultar a otro funcionario -> 403 Forbidden
    await request(app)
      .get(`/historial/${ID_OTRO_FUNCIONARIO}`)
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .set('x-user-id', 'user-funcionario-1')
      .expect(403);

    // Sin credenciales del funcionario -> 403 Forbidden
    await request(app).get(`/historial/${ID_FUNCIONARIO}`).expect(403);

    // RRHH y ADMIN pueden consultar a cualquier funcionario -> 200 OK
    await request(app)
      .get(`/historial/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(200);

    await request(app)
      .get(`/historial/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'ADMIN')
      .set('x-user-id', ID_ADMIN)
      .expect(200);
  });
});

describe('HU-16 Calendario mensual de vacaciones', () => {
  it('CA-04: RRHH ve el calendario mensual con las vacaciones aprobadas de todo el personal', async () => {
    const solDani = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111208',
      funcionarioId: ID_FUNCIONARIO,
      funcionarioNombre: 'Daniela Mendoza Vargas',
      fechaInicio: '2026-11-05',
      fechaFin: '2026-11-10',
      estado: EstadoSolicitud.APROBADA,
    });
    const solCarlos = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111209',
      funcionarioId: ID_OTRO_FUNCIONARIO,
      funcionarioNombre: 'Carlos Mamani Flores',
      fechaInicio: '2026-11-18',
      fechaFin: '2026-11-25',
      estado: EstadoSolicitud.APROBADA,
    });
    const solPendiente = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111210',
      fechaInicio: '2026-11-12',
      fechaFin: '2026-11-15',
      estado: EstadoSolicitud.PENDIENTE,
    });
    const solOtroMes = crearSolicitud({
      id: '11111111-1111-4111-8111-111111111211',
      fechaInicio: '2026-12-05',
      fechaFin: '2026-12-10',
      estado: EstadoSolicitud.APROBADA,
    });

    const { app } = crearApp({
      solicitudes: [solDani, solCarlos, solPendiente, solOtroMes],
    });

    const response = await request(app)
      .get('/calendario?mes=2026-11')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(200);

    expect(response.body.mes).toBe('2026-11');
    expect(response.body.totalAprobadas).toBe(2);
    expect(response.body.solicitudes.map((s: { id: string }) => s.id)).toEqual([
      solDani.id,
      solCarlos.id,
    ]);
    expect(Array.isArray(response.body.feriados)).toBe(true);
  });

  it('un FUNCIONARIO no tiene acceso al calendario de todo el personal (403)', async () => {
    const { app } = crearApp();

    await request(app)
      .get('/calendario?mes=2026-11')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .set('x-user-id', 'user-funcionario-1')
      .expect(403);
  });

  it('rechaza formatos de mes inválidos con 400', async () => {
    const { app } = crearApp();

    await request(app)
      .get('/calendario?mes=2026-13')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(400);

    await request(app)
      .get('/calendario?mes=noviembre')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .expect(400);
  });
});
