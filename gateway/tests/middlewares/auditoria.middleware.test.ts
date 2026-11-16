import express from 'express';
import request from 'supertest';
import {
  esOperacionAuditable,
  inferirServicio,
  extraerRecursoId,
  auditoriaMiddleware,
} from '../../src/middlewares/auditoria.middleware';
import type { AuditoriaService } from '../../src/services/auditoria.service';

describe('Auditoria Middleware & Helpers (HU-24 CA-01, CA-02, CA-03, CA-05)', () => {
  describe('esOperacionAuditable', () => {
    it('debe marcar como auditables las operaciones de mutacion (POST, PUT, PATCH, DELETE)', () => {
      expect(esOperacionAuditable('POST', '/api/usuarios')).toBe(true);
      expect(esOperacionAuditable('PUT', '/api/funcionarios/123')).toBe(true);
      expect(esOperacionAuditable('PATCH', '/api/vacaciones/solicitudes/123/estado')).toBe(true);
      expect(esOperacionAuditable('DELETE', '/api/conceptos/123')).toBe(true);
    });

    it('debe auditar descargas de PDF de contratos y boletas', () => {
      expect(esOperacionAuditable('GET', '/api/contratos/123/pdf')).toBe(true);
      expect(esOperacionAuditable('GET', '/api/v1/boletas/456/pdf')).toBe(true);
      expect(esOperacionAuditable('GET', '/api/contratos/123/pdf?token=abc')).toBe(true);
    });

    it('no debe auditar consultas GET regulares ni health', () => {
      expect(esOperacionAuditable('GET', '/api/funcionarios')).toBe(false);
      expect(esOperacionAuditable('GET', '/health')).toBe(false);
      expect(esOperacionAuditable('GET', '/api/usuarios/123')).toBe(false);
    });
  });

  describe('inferirServicio', () => {
    it('debe inferir el microservicio segun la ruta', () => {
      expect(inferirServicio('/api/auth/login')).toBe('auth');
      expect(inferirServicio('/api/usuarios')).toBe('auth');
      expect(inferirServicio('/api/funcionarios')).toBe('personal');
      expect(inferirServicio('/api/areas')).toBe('personal');
      expect(inferirServicio('/api/cargos')).toBe('personal');
      expect(inferirServicio('/api/vacaciones')).toBe('vacaciones');
      expect(inferirServicio('/api/contratos')).toBe('contratos');
      expect(inferirServicio('/api/plantillas')).toBe('contratos');
      expect(inferirServicio('/api/boletas')).toBe('boletas');
      expect(inferirServicio('/api/periodos')).toBe('boletas');
      expect(inferirServicio('/api/novedades')).toBe('boletas');
      expect(inferirServicio('/api/auditoria')).toBe('gateway');
    });
  });

  describe('extraerRecursoId', () => {
    it('debe extraer el recursoId de rutas REST estandar', () => {
      expect(extraerRecursoId('/api/funcionarios/550e8400-e29b-41d4-a716-446655440000')).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(extraerRecursoId('/api/contratos/ct-2026-001/pdf')).toBe('ct-2026-001');
      expect(extraerRecursoId('/api/periodos/123/calculo')).toBe('123');
    });

    it('retorna null si no hay recurso especifico', () => {
      expect(extraerRecursoId('/api/funcionarios')).toBeNull();
      expect(extraerRecursoId('/api/auth/login')).toBeNull();
    });
  });

  describe('auditoriaMiddleware execution (CA-02, CA-05)', () => {
    let mockService: Partial<AuditoriaService>;

    beforeEach(() => {
      mockService = {
        registrar: jest.fn().mockResolvedValue({} as any),
      };
    });

    it('registra el evento al finalizar una peticion POST', async () => {
      const app = express();
      app.use((req, _res, next) => {
        req.headers['x-user-id'] = 'user-uuid-1';
        req.headers['x-user-role'] = 'ADMIN';
        req.headers['x-request-id'] = 'req-uuid-1';
        next();
      });
      app.use(auditoriaMiddleware(mockService as AuditoriaService));
      app.post('/api/usuarios', (_req, res) => {
        res.status(201).json({ ok: true });
      });

      await request(app).post('/api/usuarios').send({ username: 'nuevo' }).expect(201);

      // Esperar al setImmediate
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockService.registrar).toHaveBeenCalledTimes(1);
      expect(mockService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 'user-uuid-1',
          rol: 'ADMIN',
          metodo: 'POST',
          ruta: '/api/usuarios',
          servicio: 'auth',
          statusCode: 201,
          requestId: 'req-uuid-1',
        }),
      );
    });

    it('CA-05: si el registro falla, no interrumpe ni rompe la respuesta del cliente', async () => {
      (mockService.registrar as jest.Mock).mockRejectedValueOnce(new Error('DB failure'));

      const app = express();
      app.use(auditoriaMiddleware(mockService as AuditoriaService));
      app.post('/api/items', (_req, res) => {
        res.status(200).json({ status: 'success' });
      });

      const res = await request(app).post('/api/items').expect(200);
      expect(res.body).toEqual({ status: 'success' });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockService.registrar).toHaveBeenCalledTimes(1);
    });
  });
});
