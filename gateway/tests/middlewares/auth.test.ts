import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { HEADERS, RolUsuario, errorHandler } from '@arca/shared';
import { jwtAuth } from '../../src/middlewares/auth.middleware';

const app = express();
app.use(jwtAuth());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/login', (_req, res) => {
  res.json({ publico: true });
});

app.get('/api/privado', (req, res) => {
  res.json({
    userId: req.headers[HEADERS.userId],
    rol: req.headers[HEADERS.userRole],
    funcionarioId: req.headers[HEADERS.funcionarioId],
  });
});

app.use(errorHandler);

const secret = process.env.JWT_SECRET as string;
const firmar = (payload: Record<string, unknown>, options: jwt.SignOptions = { expiresIn: '1h' }) =>
  jwt.sign(payload, secret, options);

describe('jwtAuth del gateway', () => {
  it('deja pasar el login y las rutas que no son /api', async () => {
    expect((await request(app).get('/api/auth/login')).status).toBe(200);
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('rechaza sin token', async () => {
    const res = await request(app).get('/api/privado');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('valida el token y propaga la identidad', async () => {
    const token = firmar({ sub: 'u-1', rol: RolUsuario.RRHH, id_funcionario: null });

    const res = await request(app).get('/api/privado').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: 'u-1', rol: RolUsuario.RRHH, funcionarioId: '' });
  });

  it('rechaza un token vencido', async () => {
    const token = firmar({ sub: 'u-1', rol: RolUsuario.RRHH, id_funcionario: null }, { expiresIn: -10 });

    const res = await request(app).get('/api/privado').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', message: 'La sesión expiró' });
  });

  it('rechaza un token inválido', async () => {
    const res = await request(app).get('/api/privado').set('Authorization', 'Bearer no-es-un-jwt');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
