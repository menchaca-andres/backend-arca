import request from 'supertest';
import { RolUsuario, MotivoBaja } from '@arca/shared';
import { app } from '../../src/app';

const comoRrhh = {
  'x-user-id': '00000000-0000-4000-8000-000000000001',
  'x-user-rol': RolUsuario.RRHH,
};

const comoFuncionario = {
  'x-user-id': '00000000-0000-4000-8000-000000000002',
  'x-user-rol': RolUsuario.FUNCIONARIO,
};

describe('Rutas de funcionarios (HU-11 y HU-12)', () => {
  describe('HU-11: POST /funcionarios/:id/ratificacion', () => {
    it('rechaza si no tiene rol RRHH o ADMIN (403)', async () => {
      const res = await request(app)
        .post('/funcionarios/11111111-1111-4111-8111-111111111101/ratificacion')
        .set(comoFuncionario)
        .send({ fechaRatificacion: '2026-11-09' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('valida formato de fecha de ratificación con Zod', async () => {
      const res = await request(app)
        .post('/funcionarios/11111111-1111-4111-8111-111111111101/ratificacion')
        .set(comoRrhh)
        .send({ fechaRatificacion: '09-11-2026' }); // Formato incorrecto

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('HU-11: GET /funcionarios/prueba-por-vencer', () => {
    it('rechaza a funcionarios sin permiso (403)', async () => {
      const res = await request(app).get('/funcionarios/prueba-por-vencer').set(comoFuncionario);

      expect(res.status).toBe(403);
    });
  });

  describe('HU-12: POST /funcionarios/:id/baja', () => {
    it('rechaza si no tiene rol RRHH o ADMIN (403)', async () => {
      const res = await request(app)
        .post('/funcionarios/11111111-1111-4111-8111-111111111101/baja')
        .set(comoFuncionario)
        .send({ fechaBaja: '2026-11-09', motivoBaja: MotivoBaja.RENUNCIA });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('CA-01: valida campos requeridos de baja (fecha y motivo)', async () => {
      const res = await request(app)
        .post('/funcionarios/11111111-1111-4111-8111-111111111101/baja')
        .set(comoRrhh)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('CA-01: exige detalleBaja si el motivo es OTRO', async () => {
      const res = await request(app)
        .post('/funcionarios/11111111-1111-4111-8111-111111111101/baja')
        .set(comoRrhh)
        .send({
          fechaBaja: '2026-11-09',
          motivoBaja: MotivoBaja.OTRO,
          detalleBaja: '', // Vacío
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rutas internas: GET /internal/funcionarios/:id', () => {
    it('rechaza con 401 si falta x-internal-key', async () => {
      const res = await request(app).get('/internal/funcionarios/11111111-1111-4111-8111-111111111101');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });
});
