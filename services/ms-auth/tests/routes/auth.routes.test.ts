import request from 'supertest';
import { RolUsuario } from '@arca/shared';
import { app } from '../../src/app';
import { usarBase } from '../helpers/db';
import { PASSWORD_PRUEBA, crearUsuario } from '../helpers/usuarios';

describe('Auth routes', () => {
  usarBase();

  it('POST /auth/login devuelve token y usuario', async () => {
    const usuario = await crearUsuario({ rol: RolUsuario.RRHH });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: usuario.email.toUpperCase(), password: PASSWORD_PRUEBA });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({ id: usuario.id, rol: RolUsuario.RRHH });
    expect(res.body.usuario.passwordHash).toBeUndefined();
  });

  it('POST /auth/login rechaza credenciales incorrectas con 401', async () => {
    const usuario = await crearUsuario();

    const res = await request(app).post('/auth/login').send({ email: usuario.email, password: 'incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('POST /auth/login valida el cuerpo con Zod', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'no-es-correo', password: '' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('GET /auth/me devuelve la identidad que dejó el gateway', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('x-user-id', '00000000-0000-4000-8000-000000000001')
      .set('x-user-rol', RolUsuario.RRHH)
      .set('x-funcionario-id', '');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      rol: RolUsuario.RRHH,
      funcionarioId: null,
    });
  });

  it('GET /auth/me rechaza sin identidad', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
