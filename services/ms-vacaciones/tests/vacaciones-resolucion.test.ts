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
const ID_SOLICITUD = '11111111-1111-4111-8111-111111111201';

function solicitud(parcial: Partial<SolicitudVacacion> = {}): SolicitudVacacion {
  return Object.assign(new SolicitudVacacion(), {
    id: ID_SOLICITUD,
    funcionarioId: ID_FUNCIONARIO,
    funcionarioNombre: 'Daniela Mendoza Vargas',
    fechaInicio: '2026-12-01',
    fechaFin: '2026-12-03',
    diasHabiles: 3,
    estado: EstadoSolicitud.PENDIENTE,
    motivoRechazo: null,
    registradoPor: ID_RRHH,
    resueltoPor: null,
    fechaResolucion: null,
    createdAt: new Date('2026-11-10T12:00:00Z'),
    ...parcial,
  });
}

function crearApp(
  opciones: { estado?: EstadoFuncionario; fechaIngreso?: string; solicitudes?: SolicitudVacacion[] } = {},
) {
  const solicitudes = opciones.solicitudes ?? [solicitud()];
  const repository = {
    findAll: async () => solicitudes,
    findById: async (id: string) => solicitudes.find((item) => item.id === id) ?? null,
    findPendientes: async () =>
      solicitudes
        .filter((item) => item.estado === EstadoSolicitud.PENDIENTE)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    findByFuncionario: async (id: string) => solicitudes.filter((item) => item.funcionarioId === id),
    findOverlapping: async () => null,
    save: async (entity: SolicitudVacacion) => entity,
  };
  const personal = {
    getFuncionario: async (id: string) =>
      id === ID_FUNCIONARIO
        ? {
            id,
            nombreCompleto: 'Daniela Mendoza Vargas',
            fechaIngreso: opciones.fechaIngreso ?? '2020-03-10',
            estado: opciones.estado ?? EstadoFuncionario.RATIFICADO,
          }
        : null,
  };
  const service = new VacacionesService(
    repository,
    personal,
    { findByYear: async (anio: number) => listarFeriados(anio) },
    () => '2026-11-10',
  );
  const app = express();
  app.use(express.json(), createVacacionesRouter(service), errorHandler);
  return { app, solicitudes };
}

const comoRRHH = (req: request.Test) => req.set('x-user-rol', 'RRHH').set('x-user-id', ID_RRHH);

describe('HU-15 bandeja de solicitudes pendientes', () => {
  it('CA-01 lista solo PENDIENTE, la más antigua primero, con el saldo del funcionario', async () => {
    const antigua = solicitud({
      id: '11111111-1111-4111-8111-111111111202',
      createdAt: new Date('2026-11-01T12:00:00Z'),
    });
    const nueva = solicitud({ createdAt: new Date('2026-11-09T12:00:00Z') });
    const aprobada = solicitud({
      id: '11111111-1111-4111-8111-111111111203',
      estado: EstadoSolicitud.APROBADA,
    });
    const { app } = crearApp({ solicitudes: [nueva, aprobada, antigua] });

    const response = await comoRRHH(request(app).get('/solicitudes/pendientes')).expect(200);

    expect(response.body.map((item: { id: string }) => item.id)).toEqual([antigua.id, nueva.id]);
    expect(response.body[0].saldo).toMatchObject({
      funcionarioId: ID_FUNCIONARIO,
      diasGanados: 90,
      diasReservados: 6,
    });
  });

  it('solo RRHH accede a la bandeja', async () => {
    const { app } = crearApp();
    await request(app).get('/solicitudes/pendientes').set('x-user-rol', 'FUNCIONARIO').expect(403);
    await request(app).get('/solicitudes/pendientes').expect(401);
  });
});

describe('HU-15 aprobar solicitud', () => {
  it('CA-02 y CA-07 aprueba, guarda quién resolvió y cuándo; los días pasan de reservados a usados', async () => {
    const { app, solicitudes } = crearApp();

    const response = await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/aprobar`)).expect(200);

    expect(response.body).toMatchObject({
      id: ID_SOLICITUD,
      estado: EstadoSolicitud.APROBADA,
      resueltoPor: ID_RRHH,
    });
    expect(response.body.fechaResolucion).toEqual(expect.any(String));
    expect(solicitudes[0].estado).toBe(EstadoSolicitud.APROBADA);

    const saldo = await request(app)
      .get(`/saldo/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'RRHH')
      .expect(200);
    expect(saldo.body).toMatchObject({ diasUsados: 3, diasReservados: 0, diasDisponibles: 87 });
  });

  it('CA-04 no cambia una solicitud ya resuelta', async () => {
    const { app } = crearApp({ solicitudes: [solicitud({ estado: EstadoSolicitud.APROBADA })] });
    await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/aprobar`)).expect(409);
    await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/rechazar`))
      .send({ motivo: 'Motivo suficiente' })
      .expect(409);
  });

  it('CA-05 nadie aprueba su propia solicitud', async () => {
    const { app, solicitudes } = crearApp();
    await request(app)
      .post(`/solicitudes/${ID_SOLICITUD}/aprobar`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .expect(403);
    expect(solicitudes[0].estado).toBe(EstadoSolicitud.PENDIENTE);
  });

  it('CA-06 revalida la elegibilidad: una baja posterior impide aprobar', async () => {
    const { app, solicitudes } = crearApp({ estado: EstadoFuncionario.BAJA });
    const response = await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/aprobar`)).expect(400);
    expect(response.body.details).toEqual({ motivo: 'El funcionario se encuentra de baja' });
    expect(solicitudes[0].estado).toBe(EstadoSolicitud.PENDIENTE);
  });

  it('CA-06 revalida el saldo: no aprueba si lo ganado menos lo usado no alcanza', async () => {
    const aprobadas = solicitud({
      id: '11111111-1111-4111-8111-111111111204',
      estado: EstadoSolicitud.APROBADA,
      diasHabiles: 89,
      resueltoPor: ID_RRHH,
      fechaResolucion: new Date('2026-11-01T12:00:00Z'),
    });
    const { app } = crearApp({ solicitudes: [solicitud(), aprobadas] });
    const response = await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/aprobar`)).expect(400);
    expect(response.body.message).toContain('superan el saldo disponible');
  });

  it('responde 404 si la solicitud no existe y 403 si no es RRHH', async () => {
    const { app } = crearApp();
    await comoRRHH(request(app).post('/solicitudes/11111111-1111-4111-8111-111111111999/aprobar')).expect(404);
    await request(app)
      .post(`/solicitudes/${ID_SOLICITUD}/aprobar`)
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_OTRO_FUNCIONARIO)
      .expect(403);
  });
});

describe('HU-15 rechazar solicitud', () => {
  it('CA-03 y CA-07 exige motivo, rechaza y libera los días reservados', async () => {
    const { app, solicitudes } = crearApp();

    await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/rechazar`)).send({}).expect(400);
    await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/rechazar`))
      .send({ motivo: 'no' })
      .expect(400);

    const response = await comoRRHH(request(app).post(`/solicitudes/${ID_SOLICITUD}/rechazar`))
      .send({ motivo: '  Coincide con el cierre de gestión  ' })
      .expect(200);

    expect(response.body).toMatchObject({
      estado: EstadoSolicitud.RECHAZADA,
      motivoRechazo: 'Coincide con el cierre de gestión',
      resueltoPor: ID_RRHH,
    });
    expect(solicitudes[0].fechaResolucion).toBeInstanceOf(Date);

    const saldo = await request(app)
      .get(`/saldo/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'RRHH')
      .expect(200);
    expect(saldo.body).toMatchObject({ diasUsados: 0, diasReservados: 0, diasDisponibles: 90 });
  });

  it('CA-05 nadie rechaza su propia solicitud', async () => {
    const { app } = crearApp();
    await request(app)
      .post(`/solicitudes/${ID_SOLICITUD}/rechazar`)
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_RRHH)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({ motivo: 'Motivo suficiente' })
      .expect(403);
  });
});
