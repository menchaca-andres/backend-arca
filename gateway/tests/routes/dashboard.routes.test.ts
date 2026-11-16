import express from 'express';
import request from 'supertest';
import { HEADERS, RolUsuario, errorHandler } from '@arca/shared';
import { createDashboardRouter } from '../../src/routes/dashboard.routes';
import { DashboardController } from '../../src/controllers/dashboard.controller';
import { DashboardService } from '../../src/services/dashboard.service';

describe('Dashboard Routes (HU-25 CA-04, CA-06)', () => {
  let mockService: Partial<DashboardService>;
  let app: express.Express;

  beforeEach(() => {
    mockService = {
      obtenerDashboard: jest.fn().mockResolvedValue({
        personal: {
          activos: 20,
          enPrueba: 5,
          bajasMes: 2,
          funcionariosPorArea: [{ area: 'Operaciones', cantidad: 10 }],
          periodosPruebaPorVencer: [],
          cumplenGestionMes: [],
        },
        vacaciones: {
          solicitudesPendientes: 4,
          alertas: [],
        },
        boletas: {
          masaSalarialUltimoPeriodo: {
            periodoId: 'p-1',
            anio: 2026,
            mes: 11,
            periodoNombre: '11/2026',
            monto: 120000,
            moneda: 'BOB',
            totalBoletas: 25,
          },
          historialMasaSalarial: [],
        },
        servicios: {
          personal: 'OK',
          vacaciones: 'OK',
          boletas: 'OK',
        },
        timestamp: new Date().toISOString(),
      }),
    };

    const controller = new DashboardController(mockService as DashboardService);
    app = express();
    app.use(express.json());

    // Middleware de autenticación simulado
    app.use((req, _res, next) => {
      const authRole = req.headers['test-role'];
      if (authRole) {
        req.headers[HEADERS.userRole] = String(authRole);
        req.headers[HEADERS.userId] = 'current-user-id';
      }
      next();
    });

    app.use('/api/v1/dashboard', createDashboardRouter(controller));
    app.use(errorHandler);
  });

  it('CA-06: rechaza a FUNCIONARIO con 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('test-role', RolUsuario.FUNCIONARIO);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('CA-06: permite acceso a DIRECCION y responde 200', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('test-role', RolUsuario.DIRECCION);

    expect(res.status).toBe(200);
    expect(res.body.personal.activos).toBe(20);
    expect(res.body.vacaciones.solicitudesPendientes).toBe(4);
    expect(res.body.boletas.masaSalarialUltimoPeriodo.monto).toBe(120000);
  });

  it('CA-06: permite acceso a RRHH y responde 200', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('test-role', RolUsuario.RRHH);

    expect(res.status).toBe(200);
  });

  it('CA-06: permite acceso a ADMIN y responde 200', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('test-role', RolUsuario.ADMIN);

    expect(res.status).toBe(200);
  });
});
