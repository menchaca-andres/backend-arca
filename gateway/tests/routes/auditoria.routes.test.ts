import express from 'express';
import request from 'supertest';
import { HEADERS, RolUsuario, errorHandler } from '@arca/shared';
import { createAuditoriaRouter } from '../../src/routes/auditoria.routes';
import { AuditoriaController } from '../../src/controllers/auditoria.controller';
import type { AuditoriaService } from '../../src/services/auditoria.service';

describe('Auditoria Routes (HU-24 CA-06)', () => {
  let mockService: Partial<AuditoriaService>;
  let app: express.Express;

  beforeEach(() => {
    mockService = {
      consultar: jest.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            fecha: new Date().toISOString(),
            usuarioId: 'u-1',
            rol: 'ADMIN',
            metodo: 'POST',
            ruta: '/api/usuarios',
            servicio: 'auth',
            statusCode: 201,
            requestId: 'req-1',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
      obtenerPorId: jest.fn().mockResolvedValue({
        id: '1',
        metodo: 'POST',
        ruta: '/api/usuarios',
      }),
    };

    const controller = new AuditoriaController(mockService as AuditoriaService);
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

    app.use('/api/v1/auditoria', createAuditoriaRouter(controller));
    app.use(errorHandler);
  });

  it('rechaza si el usuario no tiene rol ADMIN (403)', async () => {
    const res = await request(app).get('/api/v1/auditoria').set('test-role', RolUsuario.RRHH);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('permite acceso al rol ADMIN y lista los eventos', async () => {
    const res = await request(app)
      .get('/api/v1/auditoria?servicio=auth&page=1&pageSize=10')
      .set('test-role', RolUsuario.ADMIN);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].servicio).toBe('auth');
    expect(mockService.consultar).toHaveBeenCalledWith(
      expect.objectContaining({
        servicio: 'auth',
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it('permite filtrar por resultado EXITO o ERROR', async () => {
    const res = await request(app).get('/api/v1/auditoria?resultado=EXITO').set('test-role', RolUsuario.ADMIN);

    expect(res.status).toBe(200);
    expect(mockService.consultar).toHaveBeenCalledWith(
      expect.objectContaining({
        resultado: 'EXITO',
      }),
    );
  });

  it('retorna 400 si los filtros son invalidos', async () => {
    const res = await request(app)
      .get('/api/v1/auditoria?page=cero&resultado=INVALIDO')
      .set('test-role', RolUsuario.ADMIN);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('obtiene el detalle de un evento por ID', async () => {
    const res = await request(app).get('/api/v1/auditoria/1').set('test-role', RolUsuario.ADMIN);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('1');
    expect(mockService.obtenerPorId).toHaveBeenCalledWith('1');
  });
});
