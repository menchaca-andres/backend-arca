import express from 'express';
import request from 'supertest';
import { errorHandler, EstadoFuncionario, EstadoSolicitud } from '@arca/shared';
import { calcularPeriodoVacacional, evaluarElegibilidad } from '../src/domain/calculo-vacaciones';
import { contarDiasHabiles, listarFeriados } from '../src/domain/feriados';
import { SolicitudVacacion } from '../src/entities/solicitud-vacacion.entity';
import { createVacacionesRouter } from '../src/routes/vacaciones.routes';
import { VacacionesService } from '../src/services/vacaciones.service';

const ID_FUNCIONARIO = '11111111-1111-4111-8111-111111111103';
const ID_USUARIO = '11111111-1111-4111-8111-111111111104';

function crearApp(
  opciones: {
    estado?: EstadoFuncionario;
    solicitudes?: SolicitudVacacion[];
    cruce?: SolicitudVacacion | null;
  } = {},
) {
  const solicitudes = opciones.solicitudes ?? [];
  const repository = {
    findAll: async () => solicitudes,
    findByFuncionario: async (id: string) => solicitudes.filter((solicitud) => solicitud.funcionarioId === id),
    findOverlapping: async () => opciones.cruce ?? null,
    save: async (solicitud: SolicitudVacacion) => {
      const saved = Object.assign(solicitud, {
        id: '11111111-1111-4111-8111-111111111105',
        createdAt: new Date('2026-11-10T12:00:00Z'),
      });
      solicitudes.push(saved);
      return saved;
    },
  };
  const personal = {
    getFuncionario: async (id: string) =>
      id === ID_FUNCIONARIO
        ? {
            id,
            nombreCompleto: 'Daniela Mendoza Vargas',
            fechaIngreso: '2020-03-10',
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

describe('reglas de negocio de vacaciones', () => {
  it('acumula quince días por cada aniversario cumplido', () => {
    expect(calcularPeriodoVacacional('2023-03-10', '2026-11-05')).toEqual({
      gestiones: 3,
      diasGanados: 45,
      fechaProximaGestion: '2027-03-10',
    });
  });

  it('no acredita una gestión antes del aniversario ni permite elegibilidad de baja', () => {
    expect(calcularPeriodoVacacional('2025-11-11', '2026-11-10').gestiones).toBe(0);
    expect(
      evaluarElegibilidad(
        {
          id: ID_FUNCIONARIO,
          nombreCompleto: 'Funcionario de baja',
          fechaIngreso: '2020-01-01',
          estado: EstadoFuncionario.BAJA,
        },
        '2026-11-10',
      ),
    ).toEqual({ elegible: false, motivo: 'El funcionario se encuentra de baja' });
  });

  it('excluye fines de semana y feriados bolivianos', () => {
    expect(contarDiasHabiles('2026-02-13', '2026-02-18')).toBe(2);
    expect(listarFeriados(2027)).toHaveLength(11);
  });
});

describe('endpoints de HU-13 y HU-14', () => {
  it('GET /saldo/:idFuncionario devuelve saldo y elegibilidad', async () => {
    const { app } = crearApp();
    const response = await request(app)
      .get(`/saldo/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-funcionario-id', ID_FUNCIONARIO);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      elegible: true,
      gestiones: 6,
      diasGanados: 90,
      diasUsados: 0,
      diasReservados: 0,
      diasDisponibles: 90,
      fechaProximaGestion: '2027-03-10',
    });
  });

  it('GET /saldo/:idFuncionario descuenta días aprobados y pendientes', async () => {
    const solicitudes = [
      Object.assign(new SolicitudVacacion(), {
        funcionarioId: ID_FUNCIONARIO,
        diasHabiles: 10,
        estado: EstadoSolicitud.APROBADA,
      }),
      Object.assign(new SolicitudVacacion(), {
        funcionarioId: ID_FUNCIONARIO,
        diasHabiles: 5,
        estado: EstadoSolicitud.PENDIENTE,
      }),
    ];
    const { app } = crearApp({ solicitudes });
    const response = await request(app)
      .get(`/saldo/${ID_FUNCIONARIO}`)
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .expect(200);

    expect(response.body).toMatchObject({
      diasGanados: 90,
      diasUsados: 10,
      diasReservados: 5,
      diasDisponibles: 75,
    });
  });

  it('GET /dias-habiles calcula el rango con fines de semana y feriados', async () => {
    const { app } = crearApp();
    const response = await request(app).get('/dias-habiles?desde=2026-02-13&hasta=2026-02-18');
    expect(response.status).toBe(200);
    expect(response.body.diasHabiles).toBe(2);
  });

  it('GET /feriados/:anio devuelve el catálogo nacional', async () => {
    const { app } = crearApp();
    const response = await request(app).get('/feriados/2026');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(12);
    expect(response.body).toContainEqual({ fecha: '2026-01-22', descripcion: 'Día del Estado Plurinacional' });
  });

  it('GET /solicitudes requiere identidad y devuelve solicitudes existentes', async () => {
    const { app } = crearApp();
    const response = await request(app)
      .get('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-funcionario-id', ID_FUNCIONARIO);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    await request(app).get('/solicitudes').expect(401);
  });

  it('POST /solicitudes calcula días, registra al autor y reserva los días', async () => {
    const { app, solicitudes } = crearApp();
    const response = await request(app)
      .post('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_USUARIO)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({ fechaInicio: '2026-12-01', fechaFin: '2026-12-03' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      funcionarioId: ID_FUNCIONARIO,
      diasHabiles: 3,
      estado: EstadoSolicitud.PENDIENTE,
      registradoPor: ID_USUARIO,
    });
    expect(solicitudes).toHaveLength(1);
  });

  it('POST /solicitudes rechaza fechas pasadas y funcionarios ajenos', async () => {
    const { app } = crearApp();
    await request(app)
      .post('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_USUARIO)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({ fechaInicio: '2026-11-10', fechaFin: '2026-11-11' })
      .expect(400);

    await request(app)
      .post('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_USUARIO)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({
        funcionarioId: '11111111-1111-4111-8111-111111111999',
        fechaInicio: '2026-12-01',
        fechaFin: '2026-12-03',
      })
      .expect(403);
  });

  it('POST /solicitudes devuelve el motivo cuando el funcionario no es elegible', async () => {
    const { app } = crearApp({ estado: EstadoFuncionario.EN_PRUEBA });
    const response = await request(app)
      .post('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_USUARIO)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({ fechaInicio: '2026-12-01', fechaFin: '2026-12-03' })
      .expect(400);

    expect(response.body.message).toContain('El funcionario debe estar ratificado');
    expect(response.body.details).toEqual({ motivo: 'El funcionario debe estar ratificado' });
  });

  it('POST /solicitudes rechaza cruces y solicitudes que superan el saldo', async () => {
    const cruce = Object.assign(new SolicitudVacacion(), {
      id: '11111111-1111-4111-8111-111111111106',
      funcionarioId: ID_FUNCIONARIO,
      fechaInicio: '2026-12-02',
      fechaFin: '2026-12-04',
      estado: EstadoSolicitud.PENDIENTE,
    });
    const appCruce = crearApp({ cruce }).app;
    await request(appCruce)
      .post('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_USUARIO)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({ fechaInicio: '2026-12-01', fechaFin: '2026-12-03' })
      .expect(409);

    const diasReservados = Object.assign(new SolicitudVacacion(), {
      funcionarioId: ID_FUNCIONARIO,
      fechaInicio: '2026-01-05',
      fechaFin: '2026-01-05',
      diasHabiles: 90,
      estado: EstadoSolicitud.PENDIENTE,
    });
    const appSaldo = crearApp({ solicitudes: [diasReservados] }).app;
    const response = await request(appSaldo)
      .post('/solicitudes')
      .set('x-user-rol', 'FUNCIONARIO')
      .set('x-user-id', ID_USUARIO)
      .set('x-funcionario-id', ID_FUNCIONARIO)
      .send({ fechaInicio: '2026-12-01', fechaFin: '2026-12-03' })
      .expect(400);
    expect(response.body.message).toContain('superan el saldo disponible');
  });

  it('permite a RRHH registrar por un funcionario y conserva quién registró', async () => {
    const { app, solicitudes } = crearApp();
    const response = await request(app)
      .post('/solicitudes')
      .set('x-user-rol', 'RRHH')
      .set('x-user-id', ID_USUARIO)
      .send({
        funcionarioId: ID_FUNCIONARIO,
        fechaInicio: '2026-12-01',
        fechaFin: '2026-12-03',
      })
      .expect(201);

    expect(response.body.registradoPor).toBe(ID_USUARIO);
    expect(solicitudes).toHaveLength(1);
  });
});
