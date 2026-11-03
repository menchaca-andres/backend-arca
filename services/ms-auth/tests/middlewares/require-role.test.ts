import express from 'express';
import request from 'supertest';
import { RolUsuario, errorHandler, requireRole, requireSelfOrRole } from '@arca/shared';

const app = express();

app.get('/admin', requireRole(RolUsuario.ADMIN), (_req, res) => {
  res.json({ ok: true });
});

app.get(
  '/funcionarios/:id',
  requireSelfOrRole([RolUsuario.RRHH, RolUsuario.ADMIN], (req) => req.params.id),
  (_req, res) => {
    res.json({ ok: true });
  },
);

app.use(errorHandler);

describe('requireRole / requireSelfOrRole', () => {
  it('permite el rol autorizado', async () => {
    const res = await request(app).get('/admin').set('x-user-rol', RolUsuario.ADMIN);
    expect(res.status).toBe(200);
  });

  it('rechaza un rol sin permiso con 403', async () => {
    const res = await request(app).get('/admin').set('x-user-rol', RolUsuario.RRHH);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rechaza sin identidad con 401', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('permite a RRHH ver cualquier funcionario', async () => {
    const res = await request(app).get('/funcionarios/abc').set('x-user-rol', RolUsuario.RRHH);
    expect(res.status).toBe(200);
  });

  it('permite a un FUNCIONARIO ver solo su propio id', async () => {
    const propio = await request(app)
      .get('/funcionarios/abc')
      .set('x-user-rol', RolUsuario.FUNCIONARIO)
      .set('x-funcionario-id', 'abc');
    const ajeno = await request(app)
      .get('/funcionarios/abc')
      .set('x-user-rol', RolUsuario.FUNCIONARIO)
      .set('x-funcionario-id', 'otro');

    expect(propio.status).toBe(200);
    expect(ajeno.status).toBe(403);
  });
});
