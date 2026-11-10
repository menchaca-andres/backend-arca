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

  describe('HU-09: GET /funcionarios y GET /funcionarios/:id', () => {
    it('rechaza el padrón para FUNCIONARIO (403)', async () => {
      const res = await request(app).get('/funcionarios').set(comoFuncionario);

      expect(res.status).toBe(403);
    });

    it.each([
      ['pageSize mayor a 100', '/funcionarios?pageSize=500'],
      ['un área que no es UUID', '/funcionarios?areaId=finanzas'],
      ['un estado desconocido', '/funcionarios?estado=ACTIVO'],
      ['un parámetro no soportado', '/funcionarios?orden=ci'],
    ])('valida los filtros: %s (400)', async (_caso, url) => {
      const res = await request(app).get(url).set(comoRrhh);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza un ID de ficha que no es UUID (400)', async () => {
      const res = await request(app).get('/funcionarios/no-es-uuid').set(comoRrhh);

      expect(res.status).toBe(400);
    });

    it('CA-04: un FUNCIONARIO recibe 403 al pedir la ficha de otro', async () => {
      const res = await request(app)
        .get('/funcionarios/11111111-1111-4111-8111-111111111101')
        .set({ ...comoFuncionario, 'x-funcionario-id': '11111111-1111-4111-8111-111111111103' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('HU-10: POST /funcionarios/:id/asignaciones', () => {
    const url = '/funcionarios/11111111-1111-4111-8111-111111111101/asignaciones';

    it('rechaza si no tiene rol RRHH o ADMIN (403)', async () => {
      const res = await request(app)
        .post(url)
        .set(comoFuncionario)
        .send({ remuneracion: 7000, vigenteDesde: '2026-12-01', motivo: 'INCREMENTO' });

      expect(res.status).toBe(403);
    });

    it.each([
      ['sin cargo ni remuneración', { vigenteDesde: '2026-12-01', motivo: 'INCREMENTO' }],
      ['con motivo INGRESO', { remuneracion: 7000, vigenteDesde: '2026-12-01', motivo: 'INGRESO' }],
      ['sin fecha', { remuneracion: 7000, motivo: 'INCREMENTO' }],
      ['con fecha mal formada', { remuneracion: 7000, vigenteDesde: '01/12/2026', motivo: 'INCREMENTO' }],
    ])('valida el cuerpo: %s (400)', async (_caso, body) => {
      const res = await request(app).post(url).set(comoRrhh).send(body);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('HU-10: PATCH /funcionarios/:id/contacto', () => {
    const url = '/funcionarios/11111111-1111-4111-8111-111111111101/contacto';

    it('CA-07: no permite editar el CI (400)', async () => {
      const res = await request(app).patch(url).set(comoRrhh).send({ ci: '999', telefono: '700' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza un cuerpo vacío o un correo inválido (400)', async () => {
      const vacio = await request(app).patch(url).set(comoRrhh).send({});
      const correo = await request(app).patch(url).set(comoRrhh).send({ correo: 'no-es-correo' });

      expect(vacio.status).toBe(400);
      expect(correo.status).toBe(400);
    });

    it('rechaza si no tiene rol RRHH o ADMIN (403)', async () => {
      const res = await request(app).patch(url).set(comoFuncionario).send({ telefono: '700' });

      expect(res.status).toBe(403);
    });
  });
});
